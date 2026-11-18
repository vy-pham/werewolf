import { describe, expect, it } from 'vitest';
import { Harness } from './harness';

// STANDARD_8: p1 W, p2 W, p3 seer, p4 guard, p5 witch, p6 hunter, p7 V, p8 V

describe('wolves', () => {
  it('kill their target, announced at dawn without the role by default', () => {
    const h = new Harness();
    h.night({ kill: 'p7' });
    expect(h.phase).toBe('DAWN');
    expect(h.isAlive('p7')).toBe(false);
    expect(h.player('p7').death).toEqual({ round: 1, cause: 'wolves' });
    expect(h.eventsOfType('PLAYER_DIED').at(-1)?.payload).toEqual({ playerId: 'p7', role: null });
  });

  it('cannot target another wolf', () => {
    const h = new Harness();
    h.advanceTo('NIGHT');
    expect(h.tryAct('p1', { type: 'WOLF_VOTE', targetId: 'p2' })?.code).toBe('INVALID_TARGET');
  });

  it('only wolves can cast wolf votes', () => {
    const h = new Harness();
    h.advanceTo('NIGHT');
    expect(h.tryAct('p7', { type: 'WOLF_VOTE', targetId: 'p8' })?.code).toBe('NOT_YOUR_TURN');
  });

  it('share their votes only with the wolf team', () => {
    const h = new Harness();
    h.advanceTo('NIGHT');
    const [event] = h.act('p1', { type: 'WOLF_VOTE', targetId: 'p7' });
    expect(event).toMatchObject({ type: 'WOLF_VOTE_CAST', audience: { kind: 'wolves' } });
  });

  it('may change their vote while step 1 is open', () => {
    const h = new Harness();
    h.advanceTo('NIGHT');
    h.act('p1', { type: 'WOLF_VOTE', targetId: 'p7' });
    h.act('p1', { type: 'WOLF_VOTE', targetId: 'p8' });
    expect(h.state.night.wolfVotes.p1).toBe('p8');
  });

  it('kill nobody on a tie when wolfTieBreak = none', () => {
    const h = new Harness(undefined, { rules: { wolfTieBreak: 'none' } });
    h.advanceTo('NIGHT');
    h.act('p1', { type: 'WOLF_VOTE', targetId: 'p7' });
    h.act('p2', { type: 'WOLF_VOTE', targetId: 'p8' });
    h.advanceTo('DAWN');
    expect(h.isAlive('p7') && h.isAlive('p8')).toBe(true);
    expect(h.eventsOfType('NO_DEATHS')).toHaveLength(1);
  });

  it('kill exactly one tied target when wolfTieBreak = random', () => {
    const h = new Harness();
    h.advanceTo('NIGHT');
    h.act('p1', { type: 'WOLF_VOTE', targetId: 'p7' });
    h.act('p2', { type: 'WOLF_VOTE', targetId: 'p8' });
    h.advanceTo('DAWN');
    expect([h.isAlive('p7'), h.isAlive('p8')].filter((alive) => !alive)).toHaveLength(1);
  });

  it('have no kill on night 1 with noKillFirstNight, but do on night 2', () => {
    const h = new Harness(undefined, { rules: { noKillFirstNight: true } });
    h.advanceTo('NIGHT');
    expect(h.tryAct('p1', { type: 'WOLF_VOTE', targetId: 'p7' })?.code).toBe('NOT_YOUR_TURN');
    // Wolves are not required on night 1, so guard + seer finish step 1.
    h.act('p4', { type: 'GUARD_PROTECT', targetId: null });
    h.act('p3', { type: 'SEER_CHECK', targetId: null });
    expect(h.step).toBe(2);
    h.advanceTo('NIGHT'); // night 2 (vote phase passes with no votes)
    expect(h.state.round).toBe(2);
    expect(h.tryAct('p1', { type: 'WOLF_VOTE', targetId: 'p7' })).toBeNull();
  });
});

describe('guard', () => {
  it('saves the wolves’ target', () => {
    const h = new Harness();
    h.night({ kill: 'p7', guard: 'p7' });
    expect(h.isAlive('p7')).toBe(true);
    expect(h.eventsOfType('NO_DEATHS')).toHaveLength(1);
  });

  it('cannot protect the same player two nights in a row', () => {
    const h = new Harness();
    h.night({ guard: 'p7' });
    h.advanceTo('NIGHT');
    expect(h.tryAct('p4', { type: 'GUARD_PROTECT', targetId: 'p7' })?.code).toBe('INVALID_TARGET');
    expect(h.tryAct('p4', { type: 'GUARD_PROTECT', targetId: 'p8' })).toBeNull();
  });

  it('can protect the same player again after a night in between', () => {
    const h = new Harness();
    h.night({ guard: 'p7' });
    h.night({ guard: 'p8' });
    h.advanceTo('NIGHT');
    expect(h.tryAct('p4', { type: 'GUARD_PROTECT', targetId: 'p7' })).toBeNull();
  });

  it('may protect themself by default but not when guardCanSelfProtect = false', () => {
    const allowed = new Harness();
    allowed.advanceTo('NIGHT');
    expect(allowed.tryAct('p4', { type: 'GUARD_PROTECT', targetId: 'p4' })).toBeNull();

    const denied = new Harness(undefined, { rules: { guardCanSelfProtect: false } });
    denied.advanceTo('NIGHT');
    expect(denied.tryAct('p4', { type: 'GUARD_PROTECT', targetId: 'p4' })?.code).toBe(
      'INVALID_TARGET',
    );
  });

  it('acts only once per night', () => {
    const h = new Harness();
    h.advanceTo('NIGHT');
    h.act('p4', { type: 'GUARD_PROTECT', targetId: 'p7' });
    expect(h.tryAct('p4', { type: 'GUARD_PROTECT', targetId: 'p8' })?.code).toBe('CONFLICT');
  });
});

describe('seer', () => {
  it('learns immediately and privately whether the target is a wolf', () => {
    const h = new Harness();
    h.advanceTo('NIGHT');
    const events = h.act('p3', { type: 'SEER_CHECK', targetId: 'p1' });
    const result = events.find((e) => e.type === 'SEER_RESULT');
    expect(result?.audience).toEqual({ kind: 'player', playerId: 'p3' });
    expect(result?.payload).toEqual({ round: 1, targetId: 'p1', isWolf: true });

    h.advanceTo('DAWN');
    h.advanceTo('NIGHT');
    h.act('p3', { type: 'SEER_CHECK', targetId: 'p7' });
    expect(h.state.memory.seerResults.at(-1)).toEqual({ round: 2, targetId: 'p7', isWolf: false });
  });

  it('cannot check themself', () => {
    const h = new Harness();
    h.advanceTo('NIGHT');
    expect(h.tryAct('p3', { type: 'SEER_CHECK', targetId: 'p3' })?.code).toBe('INVALID_TARGET');
  });
});

describe('witch', () => {
  const toStep2 = (h: Harness, kill: string | null) => {
    h.advanceTo('NIGHT');
    h.act('p1', { type: 'WOLF_VOTE', targetId: kill });
    h.act('p2', { type: 'WOLF_VOTE', targetId: kill });
    h.act('p4', { type: 'GUARD_PROTECT', targetId: null });
    h.act('p3', { type: 'SEER_CHECK', targetId: null });
  };

  it('is told the victim at step 2 and can heal them', () => {
    const h = new Harness();
    toStep2(h, 'p7');
    expect(h.step).toBe(2);
    const info = h.eventsOfType('WITCH_INFO').at(-1);
    expect(info).toMatchObject({ audience: { kind: 'player', playerId: 'p5' } });
    expect(info?.payload).toEqual({ victimId: 'p7' });

    h.act('p5', { type: 'WITCH_ACT', heal: true, poisonTargetId: null });
    expect(h.phase).toBe('DAWN');
    expect(h.isAlive('p7')).toBe(true);
    expect(h.state.memory.witchHealUsed).toBe(true);
  });

  it('sees the victim even if the guard protected them (no guard leak)', () => {
    const h = new Harness();
    h.advanceTo('NIGHT');
    h.act('p1', { type: 'WOLF_VOTE', targetId: 'p7' });
    h.act('p2', { type: 'WOLF_VOTE', targetId: 'p7' });
    h.act('p4', { type: 'GUARD_PROTECT', targetId: 'p7' });
    h.act('p3', { type: 'SEER_CHECK', targetId: null });
    expect(h.eventsOfType('WITCH_INFO').at(-1)?.payload.victimId).toBe('p7');
  });

  it('can heal only once per game', () => {
    const h = new Harness();
    h.night({ kill: 'p7', heal: true });
    toStep2(h, 'p8');
    expect(h.tryAct('p5', { type: 'WITCH_ACT', heal: true, poisonTargetId: null })?.code).toBe(
      'ABILITY_USED',
    );
  });

  it('can heal herself by default, not when witchCanSelfHeal = false', () => {
    const allowed = new Harness();
    toStep2(allowed, 'p5');
    expect(
      allowed.tryAct('p5', { type: 'WITCH_ACT', heal: true, poisonTargetId: null }),
    ).toBeNull();
    expect(allowed.isAlive('p5')).toBe(true);

    const denied = new Harness(undefined, { rules: { witchCanSelfHeal: false } });
    toStep2(denied, 'p5');
    expect(denied.tryAct('p5', { type: 'WITCH_ACT', heal: true, poisonTargetId: null })?.code).toBe(
      'INVALID_TARGET',
    );
  });

  it('cannot heal when nobody was attacked', () => {
    const h = new Harness();
    toStep2(h, null);
    expect(h.tryAct('p5', { type: 'WITCH_ACT', heal: true, poisonTargetId: null })?.code).toBe(
      'INVALID_TARGET',
    );
  });

  it('poison kills even a guarded player', () => {
    const h = new Harness();
    h.night({ guard: 'p8', poison: 'p8' });
    expect(h.isAlive('p8')).toBe(false);
    expect(h.player('p8').death?.cause).toBe('poison');
    expect(h.state.memory.witchPoisonUsed).toBe(true);
  });

  it('uses one potion per night by default; both when witchOnePotionPerNight = false', () => {
    const strict = new Harness();
    toStep2(strict, 'p7');
    expect(strict.tryAct('p5', { type: 'WITCH_ACT', heal: true, poisonTargetId: 'p8' })?.code).toBe(
      'INVALID_TARGET',
    );

    const relaxed = new Harness(undefined, { rules: { witchOnePotionPerNight: false } });
    toStep2(relaxed, 'p7');
    relaxed.act('p5', { type: 'WITCH_ACT', heal: true, poisonTargetId: 'p8' });
    expect(relaxed.isAlive('p7')).toBe(true);
    expect(relaxed.isAlive('p8')).toBe(false);
  });

  it('cannot poison twice', () => {
    const h = new Harness();
    h.night({ poison: 'p8' });
    toStep2(h, null);
    expect(h.tryAct('p5', { type: 'WITCH_ACT', heal: false, poisonTargetId: 'p7' })?.code).toBe(
      'ABILITY_USED',
    );
  });
});

describe('night steps and timing', () => {
  it('step 1 ends as soon as every required actor has acted', () => {
    const h = new Harness();
    h.advanceTo('NIGHT');
    h.act('p1', { type: 'WOLF_VOTE', targetId: 'p7' });
    h.act('p2', { type: 'WOLF_VOTE', targetId: 'p7' });
    h.act('p4', { type: 'GUARD_PROTECT', targetId: null });
    expect(h.step).toBe(1); // still waiting for the seer
    h.act('p3', { type: 'SEER_CHECK', targetId: null });
    expect(h.step).toBe(2);
  });

  it('missing actions count as skips when the timer expires', () => {
    const h = new Harness();
    h.advanceTo('NIGHT');
    h.timeout(); // → step 2
    h.timeout(); // → dawn
    expect(h.phase).toBe('DAWN');
    expect(h.eventsOfType('NO_DEATHS')).toHaveLength(1);
  });

  it('waits for the timer when a hidden role holder is dead (no early-end leak)', () => {
    const h = new Harness();
    h.night({ kill: 'p3' }); // seer dies, role hidden
    h.advanceTo('NIGHT');
    h.act('p1', { type: 'WOLF_VOTE', targetId: 'p7' });
    h.act('p2', { type: 'WOLF_VOTE', targetId: 'p7' });
    h.act('p4', { type: 'GUARD_PROTECT', targetId: null });
    expect(h.step).toBe(1);
  });

  it('does not wait for a dead role holder when roles are revealed on death', () => {
    const h = new Harness(undefined, { rules: { revealRoleOnDeath: true } });
    h.night({ kill: 'p3' });
    h.advanceTo('NIGHT');
    h.act('p1', { type: 'WOLF_VOTE', targetId: 'p7' });
    h.act('p2', { type: 'WOLF_VOTE', targetId: 'p7' });
    h.act('p4', { type: 'GUARD_PROTECT', targetId: null });
    expect(h.step).toBe(2);
  });

  it('runs the witch step even when the witch is dead', () => {
    const h = new Harness();
    h.night({ kill: 'p5' });
    h.night({});
    expect(h.events.filter((e) => e.type === 'PHASE_CHANGED' && e.payload.step === 2)).toHaveLength(
      2,
    );
  });

  it('skips step 2 when the role set has no witch', () => {
    const h = new Harness([
      'werewolf',
      'werewolf',
      'seer',
      'guard',
      'hunter',
      'villager',
      'villager',
    ]);
    h.advanceTo('NIGHT');
    h.act('p1', { type: 'WOLF_VOTE', targetId: 'p6' });
    h.act('p2', { type: 'WOLF_VOTE', targetId: 'p6' });
    h.act('p4', { type: 'GUARD_PROTECT', targetId: null });
    h.act('p3', { type: 'SEER_CHECK', targetId: null });
    expect(h.phase).toBe('DAWN');
    expect(h.isAlive('p6')).toBe(false);
  });

  it('dead players cannot act', () => {
    const h = new Harness();
    h.night({ kill: 'p4' });
    h.advanceTo('NIGHT');
    expect(h.tryAct('p4', { type: 'GUARD_PROTECT', targetId: 'p7' })?.code).toBe('PLAYER_DEAD');
  });
});
