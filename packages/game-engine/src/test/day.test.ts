import { describe, expect, it } from 'vitest';
import { Harness } from './harness';

// STANDARD_8: p1 W, p2 W, p3 seer, p4 guard, p5 witch, p6 hunter, p7 V, p8 V

const peacefulNight = (h: Harness) => h.night({});

describe('day vote', () => {
  it('executes the majority after a defense phase', () => {
    const h = new Harness();
    peacefulNight(h);
    const events = h.vote({ p1: 'p7', p2: 'p7', p3: 'p7', p4: 'p8' });
    expect(events.find((e) => e.type === 'VOTE_RESULT')?.payload).toEqual({
      tally: { p7: 3, p8: 1 },
      skips: 0,
      executedId: 'p7',
      tie: [],
      revote: false,
    });
    expect(h.phase).toBe('DEFENSE');
    expect(h.state.day.accusedId).toBe('p7');
    expect(h.isAlive('p7')).toBe(true);

    h.timeout();
    expect(h.phase).toBe('EXECUTION');
    expect(h.player('p7').death).toEqual({ round: 1, cause: 'execution' });
  });

  it('skips DEFENSE when defenseSeconds = 0', () => {
    const h = new Harness(undefined, { timers: { defenseSeconds: 0 } });
    peacefulNight(h);
    h.vote({ p1: 'p7' });
    expect(h.phase).toBe('EXECUTION');
    expect(h.isAlive('p7')).toBe(false);
  });

  it('executes nobody when skips are at least the top count', () => {
    const h = new Harness();
    peacefulNight(h);
    h.vote({ p1: 'p7', p2: null, p3: null });
    expect(h.phase).toBe('NIGHT');
    expect(h.state.round).toBe(2);
    expect(h.state.players.every((p) => p.alive)).toBe(true);
  });

  it('does not count abstentions as skips', () => {
    const h = new Harness();
    peacefulNight(h);
    h.vote({ p1: 'p7' });
    expect(h.state.day.accusedId).toBe('p7');
  });

  it('counts only the final vote of each player', () => {
    const h = new Harness();
    peacefulNight(h);
    h.advanceTo('VOTE');
    h.act('p1', { type: 'DAY_VOTE', targetId: 'p7' });
    h.act('p1', { type: 'DAY_VOTE', targetId: 'p8' });
    h.timeout();
    expect(h.state.day.accusedId).toBe('p8');
  });

  it('executes nobody on a tie by default', () => {
    const h = new Harness();
    peacefulNight(h);
    const events = h.vote({ p1: 'p7', p2: 'p8' });
    expect(events.find((e) => e.type === 'VOTE_RESULT')?.payload).toMatchObject({
      executedId: null,
      tie: ['p7', 'p8'],
      revote: false,
    });
    expect(h.phase).toBe('NIGHT');
  });

  it('revotes among tied players up to maxRevotes, then executes nobody', () => {
    const h = new Harness(undefined, { rules: { voteTieBreak: 'revote', maxRevotes: 2 } });
    peacefulNight(h);
    h.vote({ p1: 'p7', p2: 'p8' });
    expect(h.phase).toBe('VOTE');
    expect(h.state.phase.revote).toBe(1);
    expect(h.state.day.candidates).toEqual(['p7', 'p8']);
    expect(h.tryAct('p1', { type: 'DAY_VOTE', targetId: 'p3' })?.code).toBe('INVALID_TARGET');
    expect(h.tryAct('p1', { type: 'DAY_VOTE', targetId: null })).toBeNull(); // skip is allowed

    h.vote({ p1: 'p7', p2: 'p8' });
    expect(h.state.phase.revote).toBe(2);
    h.vote({ p1: 'p7', p2: 'p8' });
    expect(h.phase).toBe('NIGHT');
    expect(h.eventsOfType('VOTE_RESULT').map((e) => e.payload.revote)).toEqual([true, true, false]);
  });

  it('a revote can resolve the tie', () => {
    const h = new Harness(undefined, { rules: { voteTieBreak: 'revote' } });
    peacefulNight(h);
    h.vote({ p1: 'p7', p2: 'p8' });
    h.vote({ p1: 'p7', p2: 'p7', p3: 'p8' });
    expect(h.phase).toBe('DEFENSE');
    expect(h.state.day.accusedId).toBe('p7');
  });

  it('rejects self votes, dead voters and votes outside VOTE', () => {
    const h = new Harness();
    h.night({ kill: 'p8' });
    expect(h.tryAct('p1', { type: 'DAY_VOTE', targetId: 'p7' })?.code).toBe('NOT_YOUR_TURN');
    h.advanceTo('VOTE');
    expect(h.tryAct('p1', { type: 'DAY_VOTE', targetId: 'p1' })?.code).toBe('INVALID_TARGET');
    expect(h.tryAct('p8', { type: 'DAY_VOTE', targetId: 'p1' })?.code).toBe('PLAYER_DEAD');
    expect(h.tryAct('p1', { type: 'DAY_VOTE', targetId: 'p8' })?.code).toBe('INVALID_TARGET');
  });

  it('broadcasts every vote publicly', () => {
    const h = new Harness();
    peacefulNight(h);
    h.advanceTo('VOTE');
    const [event] = h.act('p3', { type: 'DAY_VOTE', targetId: 'p1' });
    expect(event).toEqual({
      type: 'VOTE_CAST',
      audience: { kind: 'all' },
      payload: { voterId: 'p3', targetId: 'p1' },
    });
  });
});

describe('hunter', () => {
  it('shoots after dawn when killed by wolves', () => {
    const h = new Harness();
    h.night({ kill: 'p6' });
    h.timeout(); // DAWN →
    expect(h.phase).toBe('HUNTER_SHOT');
    expect(h.tryAct('p7', { type: 'HUNTER_SHOOT', targetId: 'p1' })?.code).toBe('NOT_YOUR_TURN');
    h.act('p6', { type: 'HUNTER_SHOOT', targetId: 'p1' });
    expect(h.player('p1').death?.cause).toBe('hunter');
    expect(h.phase).toBe('DISCUSSION');
  });

  it('shoots after being executed, then the night starts', () => {
    const h = new Harness();
    h.night({});
    h.vote({ p1: 'p6' });
    h.advanceTo('HUNTER_SHOT');
    h.act('p6', { type: 'HUNTER_SHOOT', targetId: 'p2' });
    expect(h.isAlive('p2')).toBe(false);
    expect(h.phase).toBe('NIGHT');
  });

  it('cannot shoot when poisoned unless hunterShootsWhenPoisoned', () => {
    const h = new Harness();
    h.night({ poison: 'p6' });
    h.timeout();
    expect(h.phase).toBe('DISCUSSION');

    const allowed = new Harness(undefined, { rules: { hunterShootsWhenPoisoned: true } });
    allowed.night({ poison: 'p6' });
    allowed.timeout();
    expect(allowed.phase).toBe('HUNTER_SHOT');
  });

  it('does not shoot when the timer runs out', () => {
    const h = new Harness();
    h.night({ kill: 'p6' });
    h.advanceTo('HUNTER_SHOT');
    h.timeout();
    expect(h.eventsOfType('HUNTER_SHOT').at(-1)?.payload).toEqual({
      hunterId: 'p6',
      targetId: null,
    });
    expect(h.phase).toBe('DISCUSSION');
  });

  it('can end the game by shooting the last wolf', () => {
    const h = new Harness();
    h.night({});
    h.vote({ p3: 'p1', p4: 'p1' });
    h.night({ kill: 'p6' }); // only p2 is left on the wolf team
    h.advanceTo('HUNTER_SHOT');
    h.act('p6', { type: 'HUNTER_SHOOT', targetId: 'p2' });
    expect(h.phase).toBe('GAME_OVER');
    expect(h.state.winner).toBe('village');
  });
});
