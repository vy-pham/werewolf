import { describe, expect, it } from 'vitest';
import { canSend, voicePermissions } from '../voice';
import { Harness } from './harness';

// STANDARD_8: p1 W, p2 W, p3 seer, p4 guard, p5 witch, p6 hunter, p7 V, p8 V

const TALK = { publish: true, subscribe: true };
const LISTEN = { publish: false, subscribe: true };

describe('voicePermissions (docs/04-game-rules.md §8)', () => {
  it('night step 1: wolves talk privately, villagers are silent and deaf, the dead talk together', () => {
    const h = new Harness();
    h.night({ kill: 'p8' });
    h.advanceTo('NIGHT');
    expect(voicePermissions(h.state, 'p7')).toEqual({});
    expect(voicePermissions(h.state, 'p3')).toEqual({});
    expect(voicePermissions(h.state, 'p1')).toEqual({ wolves: TALK });
    expect(voicePermissions(h.state, 'p8')).toEqual({ dead: TALK });
    expect(voicePermissions(h.state, null)).toEqual({});
  });

  it('wolves fall silent once their turn is over (witch step) and during role reveal', () => {
    const h = new Harness();
    expect(h.phase).toBe('ROLE_REVEAL');
    expect(voicePermissions(h.state, 'p1')).toEqual({});
    h.advanceTo('NIGHT', 2);
    expect(voicePermissions(h.state, 'p1')).toEqual({});
    expect(voicePermissions(h.state, 'p5')).toEqual({});
  });

  it('discussion: only the current speaker talks, everyone else listens', () => {
    const h = new Harness();
    h.night({ kill: 'p8' });
    h.advanceTo('DISCUSSION');
    expect(h.state.day.speakerOrder[0]).toBe('p1');
    expect(voicePermissions(h.state, 'p1')).toEqual({ main: TALK });
    expect(voicePermissions(h.state, 'p2')).toEqual({ main: LISTEN });
    expect(voicePermissions(h.state, 'p8')).toEqual({ main: LISTEN, dead: TALK });
    expect(voicePermissions(h.state, null)).toEqual({ main: LISTEN });

    h.act('p1', { type: 'END_TURN' });
    expect(voicePermissions(h.state, 'p1')).toEqual({ main: LISTEN });
    expect(voicePermissions(h.state, 'p2')).toEqual({ main: TALK });
  });

  it('dawn, vote and execution are silent for everyone', () => {
    const h = new Harness();
    h.night({});
    expect(h.phase).toBe('DAWN');
    expect(voicePermissions(h.state, 'p1')).toEqual({ main: LISTEN });
    h.advanceTo('VOTE');
    for (const id of ['p1', 'p3', 'p7'])
      expect(voicePermissions(h.state, id)).toEqual({ main: LISTEN });
    h.act('p1', { type: 'DAY_VOTE', targetId: 'p7' });
    h.advanceTo('EXECUTION');
    expect(voicePermissions(h.state, 'p3')).toEqual({ main: LISTEN });
  });

  it('defense: only the accused talks', () => {
    const h = new Harness();
    h.night({});
    h.vote({ p1: 'p7' });
    expect(h.phase).toBe('DEFENSE');
    expect(voicePermissions(h.state, 'p7')).toEqual({ main: TALK });
    expect(voicePermissions(h.state, 'p1')).toEqual({ main: LISTEN });
  });

  it('hunter shot: only the dying hunter talks', () => {
    const h = new Harness();
    h.night({ kill: 'p6' });
    h.advanceTo('HUNTER_SHOT');
    expect(voicePermissions(h.state, 'p6')).toEqual({ main: TALK, dead: TALK });
    expect(voicePermissions(h.state, 'p1')).toEqual({ main: LISTEN });
  });

  it('game over: everyone talks on main', () => {
    const h = new Harness(['werewolf', 'werewolf', 'seer', 'guard', 'villager', 'villager']);
    h.night({ kill: 'p5' });
    h.vote({ p1: 'p3', p2: 'p3', p6: 'p3' });
    h.advanceTo('GAME_OVER');
    for (const id of [null, 'p1', 'p3', 'p5']) {
      expect(voicePermissions(h.state, id)).toEqual({ main: TALK });
    }
  });
});

describe('canSend (text chat follows the same rules)', () => {
  it('lets only the floor holder post on main, wolves only on their turn', () => {
    const h = new Harness();
    h.advanceTo('NIGHT');
    expect(canSend(h.state, 'p1', 'wolves')).toBe(true);
    expect(canSend(h.state, 'p7', 'wolves')).toBe(false);
    expect(canSend(h.state, 'p1', 'main')).toBe(false);

    h.night({ kill: 'p8' });
    h.advanceTo('DISCUSSION');
    expect(canSend(h.state, 'p1', 'main')).toBe(true);
    expect(canSend(h.state, 'p2', 'main')).toBe(false);
    expect(canSend(h.state, 'p8', 'dead')).toBe(true);
    expect(canSend(h.state, 'p8', 'main')).toBe(false);
    expect(canSend(h.state, null, 'main')).toBe(false);
  });
});
