import type { CaptionView, DeliveredGameEvent, PlayerView } from '@werewolf/shared';
import type { TFunction } from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CAPTION_TTL_MS, useGame } from './game-store';
import {
  captionLangOf,
  countVotes,
  describeEvent,
  nextSelection,
  phaseTitleKey,
  secondsLeft,
  targetable,
} from './game-ui';

const view = (over: Partial<PlayerView> = {}): PlayerView => ({
  round: 1,
  phase: { name: 'NIGHT', step: 1, endsAt: 0, revote: 0 },
  players: [
    { id: 'me', seat: 1, alive: true, role: 'werewolf' },
    { id: 'w2', seat: 2, alive: true, role: 'werewolf' },
    { id: 'v1', seat: 3, alive: true, role: null },
    { id: 'v2', seat: 4, alive: false, role: null },
  ],
  me: {
    id: 'me',
    role: 'werewolf',
    team: 'wolves',
    alive: true,
    pendingAction: 'WOLF_VOTE',
    submitted: false,
  },
  wolfVotes: {},
  dayVotes: null,
  candidates: null,
  accusedId: null,
  hunterId: null,
  speakerOrder: null,
  speakerId: null,
  winner: null,
  lovers: null,
  channels: {},
  ...over,
});

const ME = view().me as NonNullable<PlayerView['me']>;

describe('targetable', () => {
  it('lets wolves pick only living non-wolves', () => {
    const v = view();
    expect(['me', 'w2', 'v1', 'v2'].filter((id) => targetable(v, undefined, id))).toEqual(['v1']);
  });

  it('restricts a revote to the candidates and forbids self votes', () => {
    const v = view({
      phase: { name: 'VOTE', step: 1, endsAt: 0, revote: 1 },
      candidates: ['w2'],
      me: { ...ME, pendingAction: 'DAY_VOTE' },
    });
    expect(['me', 'w2', 'v1'].filter((id) => targetable(v, undefined, id))).toEqual(['w2']);
  });

  it('nothing is targetable without a pending action', () => {
    expect(targetable(view({ me: { ...ME, pendingAction: null } }), undefined, 'v1')).toBe(false);
  });
});

describe('formatting helpers', () => {
  const t = ((key: string, opts?: Record<string, string>) =>
    opts ? `${key}:${JSON.stringify(opts)}` : key) as unknown as TFunction;

  it('describes events with player names', () => {
    const e = {
      gameId: 'g',
      seq: 1,
      type: 'PLAYER_DIED',
      payload: { playerId: 'v1', role: null },
    } as DeliveredGameEvent;
    expect(describeEvent(e, t, () => 'Alice')).toBe('log.died:{"name":"Alice"}');
    const hidden = { ...e, type: 'WOLF_VOTE_CAST' } as unknown as DeliveredGameEvent;
    expect(describeEvent(hidden, t, () => 'x')).toBeNull();
  });

  it('counts votes, phase titles and countdowns', () => {
    expect(countVotes({ a: 'x', b: 'x', c: null, d: 'y' })).toEqual({ x: 2, y: 1 });
    expect(phaseTitleKey(view())).toBe('phase.NIGHT_1');
    expect(secondsLeft(10_500, 0)).toBe(11);
    expect(secondsLeft(0, 5)).toBe(0);
  });
});

describe('game store', () => {
  beforeEach(() => useGame.getState().leaveRoom());

  it('ignores duplicate or old events and merges a sync without duplicates', () => {
    const ev = (seq: number) =>
      ({ gameId: 'g', seq, type: 'NO_DEATHS', payload: {} }) as DeliveredGameEvent;
    useGame.getState().onEvent(ev(1));
    useGame.getState().onEvent(ev(1));
    useGame.getState().onEvent(ev(2));
    useGame.getState().applySync('g', { view: view(), events: [ev(2), ev(3)], chat: [] });
    expect(useGame.getState().events.map((e) => e.seq)).toEqual([1, 2, 3]);
    expect(useGame.getState().lastSeq).toBe(3);
  });

  it('keeps the final view as the result when the game ends', () => {
    const over = view({ phase: { name: 'GAME_OVER', step: 1, endsAt: 0, revote: 0 } });
    useGame.getState().onState('g', over);
    expect(useGame.getState().lastResult).toBe(over);
  });
});

describe('captions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useGame.getState().leaveRoom();
  });
  afterEach(() => vi.useRealTimers());

  const caption = (id: string): CaptionView => ({
    id,
    channel: 'main',
    speakerId: 'u1',
    speakerName: 'An',
    text: `t${id}`,
    lang: 'en',
    original: `t${id}`,
    sourceLang: 'en',
    at: 0,
  });

  it('keeps the last 3 captions, ignores duplicates, and expires them', () => {
    const { onCaption } = useGame.getState();
    for (const id of ['1', '2', '3', '3', '4']) onCaption(caption(id));
    expect(useGame.getState().captions.map((c) => c.id)).toEqual(['2', '3', '4']);
    vi.advanceTimersByTime(CAPTION_TTL_MS);
    expect(useGame.getState().captions).toEqual([]);
  });

  it('caption language: preference first, then UI language', () => {
    expect(captionLangOf({ locale: 'en', captionLangs: [] })).toBe('en');
    expect(captionLangOf({ locale: 'en', captionLangs: ['vi'] })).toBe('vi');
    expect(captionLangOf({ locale: 'vi', captionLangs: ['xx'] })).toBe('vi');
  });
});

describe('selection', () => {
  it('single target: tapping replaces; Cupid keeps the last two', () => {
    expect(nextSelection('SEER_CHECK', ['a'], 'b')).toEqual(['b']);
    expect(nextSelection('SEER_CHECK', ['a'], 'a')).toEqual([]);
    expect(nextSelection('CUPID_LINK', ['a'], 'b')).toEqual(['a', 'b']);
    expect(nextSelection('CUPID_LINK', ['a', 'b'], 'c')).toEqual(['b', 'c']);
    expect(nextSelection('CUPID_LINK', ['a', 'b'], 'a')).toEqual(['b']);
  });

  it('alpha wolf cannot target a wolf; cupid may pick themself', () => {
    const v = view({
      players: [
        { id: 'me', seat: 1, alive: true, role: 'alpha_wolf' },
        { id: 'w2', seat: 2, alive: true, role: 'werewolf' },
        { id: 'v1', seat: 3, alive: true, role: null },
      ],
      me: { ...ME, role: 'alpha_wolf' },
    });
    expect(['me', 'w2', 'v1'].filter((id) => targetable(v, undefined, id))).toEqual(['v1']);
    const c = view({ me: { ...ME, role: 'cupid', team: 'village', pendingAction: 'CUPID_LINK' } });
    expect(targetable(c, undefined, 'me')).toBe(true);
  });
});
