import { describe, expect, it } from 'vitest';
import { voicePermissions } from '../voice';
import { Harness } from './harness';

// STANDARD_8: p1 W, p2 W, p3 seer, p4 guard, p5 witch, p6 hunter, p7 V, p8 V

const TALK = { publish: true, subscribe: true };
const LISTEN = { publish: false, subscribe: true };

describe('voicePermissions (docs/04-game-rules.md §8)', () => {
  it('night: villagers are silent and deaf, wolves talk privately, the dead talk together', () => {
    const h = new Harness();
    h.night({ kill: 'p8' });
    h.advanceTo('NIGHT');
    expect(voicePermissions(h.state, 'p7')).toEqual({});
    expect(voicePermissions(h.state, 'p3')).toEqual({});
    expect(voicePermissions(h.state, 'p1')).toEqual({ wolves: TALK });
    expect(voicePermissions(h.state, 'p8')).toEqual({ dead: TALK });
    expect(voicePermissions(h.state, null)).toEqual({});
  });

  it('role reveal behaves like the night', () => {
    const h = new Harness();
    expect(h.phase).toBe('ROLE_REVEAL');
    expect(voicePermissions(h.state, 'p7')).toEqual({});
    expect(voicePermissions(h.state, 'p2')).toEqual({ wolves: TALK });
  });

  it('day: the living talk, the dead and spectators only listen to main', () => {
    const h = new Harness();
    h.night({ kill: 'p8' });
    h.advanceTo('DISCUSSION');
    expect(voicePermissions(h.state, 'p1')).toEqual({ main: TALK });
    expect(voicePermissions(h.state, 'p7')).toEqual({ main: TALK });
    expect(voicePermissions(h.state, 'p8')).toEqual({ main: LISTEN, dead: TALK });
    expect(voicePermissions(h.state, null)).toEqual({ main: LISTEN });
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
