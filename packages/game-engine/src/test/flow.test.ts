import { RoomSettingsSchema } from '@werewolf/shared';
import { describe, expect, it } from 'vitest';
import { createGame } from '../create';
import { dispatch } from '../dispatch';
import { createRng } from '../rng';
import { presetFor } from '../role-set';
import { Harness, T0 } from './harness';

const players = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `u${i}`, seat: i }));
const settingsFor = (n: number) => RoomSettingsSchema.parse({ roles: presetFor(n) });

describe('createGame', () => {
  it('deals exactly the configured roles and starts ROLE_REVEAL', () => {
    const result = createGame(
      { players: players(10), settings: settingsFor(10) },
      { now: T0, rng: createRng(1) },
    );
    if (!result.ok) throw new Error(result.error.message);
    const dealt: Record<string, number> = {};
    for (const p of result.state.players) dealt[p.role] = (dealt[p.role] ?? 0) + 1;
    expect(dealt).toEqual(presetFor(10));
    expect(result.state.phase).toEqual({
      name: 'ROLE_REVEAL',
      step: 1,
      endsAt: T0 + 10_000,
      revote: 0,
    });
  });

  it('is deterministic for a given seed', () => {
    const deal = (seed: number) => {
      const r = createGame(
        { players: players(12), settings: settingsFor(12) },
        { now: T0, rng: createRng(seed) },
      );
      if (!r.ok) throw new Error(r.error.message);
      return r.state.players.map((p) => p.role);
    };
    expect(deal(123)).toEqual(deal(123));
  });

  it('tells each player their role privately, and wolves their team', () => {
    const r = createGame(
      { players: players(8), settings: settingsFor(8) },
      { now: T0, rng: createRng(5) },
    );
    if (!r.ok) throw new Error(r.error.message);
    const assigned = r.events.filter((e) => e.type === 'ROLE_ASSIGNED');
    expect(assigned).toHaveLength(8);
    const wolves = r.state.players.filter((p) => p.role === 'werewolf').map((p) => p.id);
    for (const e of assigned) {
      if (e.type !== 'ROLE_ASSIGNED' || e.audience.kind !== 'player') throw new Error('bad event');
      const isWolf = wolves.includes(e.audience.playerId);
      expect(e.payload.wolfTeam).toEqual(isWolf ? wolves : []);
    }
  });

  it('rejects invalid role sets and duplicate players', () => {
    const ctx = { now: T0, rng: createRng(1) };
    const bad = RoomSettingsSchema.parse({ roles: { werewolf: 4, villager: 4 } });
    const r1 = createGame({ players: players(8), settings: bad }, ctx);
    expect(r1.ok ? null : r1.error.code).toBe('INVALID_ROLE_SET');

    const dupes = [...players(7), { id: 'u0', seat: 99 }];
    const r2 = createGame({ players: dupes, settings: settingsFor(8) }, ctx);
    expect(r2.ok ? null : r2.error.code).toBe('VALIDATION_FAILED');
  });
});

describe('dispatch', () => {
  it('never mutates the input state', () => {
    const h = new Harness();
    h.advanceTo('NIGHT');
    const before = JSON.stringify(h.state);
    const result = dispatch(
      h.state,
      { kind: 'command', actorId: 'p1', command: { type: 'WOLF_VOTE', targetId: 'p7' } },
      h.ctx(),
    );
    expect(result.ok).toBe(true);
    expect(JSON.stringify(h.state)).toBe(before);
  });

  it('rejects a timeout before the phase has expired', () => {
    const h = new Harness();
    const r = dispatch(h.state, { kind: 'timeout' }, { now: T0 + 1, rng: createRng(1) });
    expect(r.ok ? null : r.error.code).toBe('CONFLICT');
  });

  it('rejects unknown players', () => {
    const h = new Harness();
    h.advanceTo('NIGHT');
    expect(h.tryAct('nobody', { type: 'WOLF_VOTE', targetId: 'p7' })?.code).toBe('FORBIDDEN');
  });

  it('keeps state JSON-serializable (stored as-is in MongoDB)', () => {
    const h = new Harness();
    h.night({ kill: 'p7', seer: 'p1' });
    expect(JSON.parse(JSON.stringify(h.state))).toEqual(h.state);
  });
});

describe('win conditions', () => {
  it('wolves win at parity', () => {
    const h = new Harness(['werewolf', 'werewolf', 'seer', 'guard', 'villager', 'villager']);
    h.night({ kill: 'p5' }); // 2 wolves vs 3
    h.vote({ p1: 'p3', p2: 'p3', p6: 'p3' }); // 2 wolves vs 2
    h.advanceTo('GAME_OVER');
    expect(h.state.winner).toBe('wolves');
    const over = h.eventsOfType('GAME_OVER').at(-1);
    expect(over?.payload.winner).toBe('wolves');
    expect(Object.keys(over?.payload.roles ?? {})).toHaveLength(6);
  });

  it('village wins when the last wolf is executed, and the game then rejects input', () => {
    const h = new Harness();
    h.night({ kill: 'p7', seer: 'p1' });
    h.vote({ p3: 'p1', p4: 'p1', p5: 'p1' });
    h.night({ kill: 'p3', guard: 'p3', seer: 'p2' });
    expect(h.isAlive('p3')).toBe(true);
    h.vote({ p3: 'p2', p4: 'p2', p6: 'p2' });
    h.advanceTo('GAME_OVER');
    expect(h.state.winner).toBe('village');
    expect(h.tryAct('p3', { type: 'DAY_VOTE', targetId: 'p4' })?.code).toBe('CONFLICT');
    expect(() => h.timeout()).toThrow();
  });

  it('follows the documented phase order through a full day', () => {
    const h = new Harness();
    h.night({ kill: 'p7' });
    h.vote({ p1: 'p8' });
    h.advanceTo('NIGHT');
    const order = h
      .eventsOfType('PHASE_CHANGED')
      .map((e) => `${e.payload.name}${e.payload.name === 'VOTE' ? '' : e.payload.step}`)
      .map((label) => label.replace(/^(DAWN|DEFENSE|EXECUTION)1$/, '$1'));
    // p7 died, so 7 living players get one speaking turn each.
    expect(order).toEqual([
      'NIGHT1',
      'NIGHT2',
      'DAWN',
      'DISCUSSION1',
      'DISCUSSION2',
      'DISCUSSION3',
      'DISCUSSION4',
      'DISCUSSION5',
      'DISCUSSION6',
      'DISCUSSION7',
      'VOTE',
      'DEFENSE',
      'EXECUTION',
      'NIGHT1',
    ]);
  });
});
