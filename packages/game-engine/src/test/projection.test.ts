import type { PlayerView } from '@werewolf/shared';
import { describe, expect, it } from 'vitest';
import { projectFor } from '../projection';
import type { GameState } from '../types';
import { Harness } from './harness';

// STANDARD_8: p1 W, p2 W, p3 seer, p4 guard, p5 witch, p6 hunter, p7 V, p8 V

const roleOf = (view: PlayerView, id: string) => view.players.find((p) => p.id === id)?.role;
const knownRoles = (view: PlayerView) =>
  view.players.filter((p) => p.role !== null).map((p) => p.id);

/** The invariant every view must satisfy, whatever the phase. */
function assertNoLeak(s: GameState, viewerId: string | null) {
  const view = projectFor(s, viewerId);
  const viewer = s.players.find((p) => p.id === viewerId);
  for (const p of view.players) {
    if (p.role === null) continue;
    const allowed =
      s.phase.name === 'GAME_OVER' ||
      p.id === viewerId ||
      (viewer?.role === 'werewolf' && p.role === 'werewolf') ||
      (!p.alive && s.rules.revealRoleOnDeath);
    expect(allowed, `${viewerId ?? 'spectator'} must not see ${p.id}'s role`).toBe(true);
    expect(p.role).toBe(s.players.find((x) => x.id === p.id)?.role);
  }
  if (viewer?.role !== 'werewolf') expect(view.wolfVotes).toBeNull();
  if (viewer?.role !== 'seer') expect(view.me?.seerResults).toBeUndefined();
  if (viewer?.role !== 'witch') expect(view.me?.witch).toBeUndefined();
}

const assertNoLeakForAll = (h: Harness) => {
  for (const id of [null, ...h.state.players.map((p) => p.id)]) assertNoLeak(h.state, id);
};

describe('projectFor', () => {
  it('a villager knows only their own role', () => {
    const h = new Harness();
    h.advanceTo('NIGHT');
    const view = projectFor(h.state, 'p7');
    expect(knownRoles(view)).toEqual(['p7']);
    expect(view.me).toMatchObject({ role: 'villager', team: 'village', pendingAction: null });
    expect(view.wolfVotes).toBeNull();
  });

  it('wolves see each other and the pack’s votes during the night', () => {
    const h = new Harness();
    h.advanceTo('NIGHT');
    h.act('p1', { type: 'WOLF_VOTE', targetId: 'p7' });
    const view = projectFor(h.state, 'p2');
    expect(knownRoles(view)).toEqual(['p1', 'p2']);
    expect(view.wolfVotes).toEqual({ p1: 'p7' });
    expect(view.me?.pendingAction).toBe('WOLF_VOTE');
    expect(view.me?.submitted).toBe(false);
  });

  it('spectators see no roles and have no `me`', () => {
    const h = new Harness();
    h.advanceTo('NIGHT');
    const view = projectFor(h.state, null);
    expect(view.me).toBeNull();
    expect(knownRoles(view)).toEqual([]);
  });

  it('the witch sees the victim only during step 2', () => {
    const h = new Harness();
    h.advanceTo('NIGHT');
    h.act('p1', { type: 'WOLF_VOTE', targetId: 'p7' });
    h.act('p2', { type: 'WOLF_VOTE', targetId: 'p7' });
    expect(projectFor(h.state, 'p5').me?.witch?.victimId).toBeNull();
    h.act('p4', { type: 'GUARD_PROTECT', targetId: null });
    h.act('p3', { type: 'SEER_CHECK', targetId: null });
    const view = projectFor(h.state, 'p5');
    expect(view.me?.witch).toEqual({ healUsed: false, poisonUsed: false, victimId: 'p7' });
    expect(view.me?.pendingAction).toBe('WITCH_ACT');
  });

  it('the seer keeps their results; the guard sees their last target', () => {
    const h = new Harness();
    h.night({ seer: 'p1', guard: 'p8' });
    expect(projectFor(h.state, 'p3').me?.seerResults).toEqual([
      { round: 1, targetId: 'p1', isWolf: true },
    ]);
    expect(projectFor(h.state, 'p4').me?.guardLastTargetId).toBe('p8');
  });

  it('marks actions as submitted', () => {
    const h = new Harness();
    h.advanceTo('NIGHT');
    expect(projectFor(h.state, 'p4').me).toMatchObject({
      pendingAction: 'GUARD_PROTECT',
      submitted: false,
    });
    h.act('p4', { type: 'GUARD_PROTECT', targetId: 'p7' });
    expect(projectFor(h.state, 'p4').me?.submitted).toBe(true);
  });

  it('hides dead players’ roles by default and reveals them with revealRoleOnDeath', () => {
    const hidden = new Harness();
    hidden.night({ kill: 'p3' });
    expect(roleOf(projectFor(hidden.state, 'p7'), 'p3')).toBeNull();

    const revealed = new Harness(undefined, { rules: { revealRoleOnDeath: true } });
    revealed.night({ kill: 'p3' });
    expect(roleOf(projectFor(revealed.state, 'p7'), 'p3')).toBe('seer');
    expect(revealed.eventsOfType('PLAYER_DIED').at(-1)?.payload.role).toBe('seer');
  });

  it('dead players do not gain extra knowledge', () => {
    const h = new Harness();
    h.night({ kill: 'p7' });
    expect(knownRoles(projectFor(h.state, 'p7'))).toEqual(['p7']);
  });

  it('reveals every role at GAME_OVER', () => {
    const h = new Harness(['werewolf', 'werewolf', 'seer', 'guard', 'villager', 'villager']);
    h.night({ kill: 'p5' });
    h.vote({ p1: 'p3', p2: 'p3', p6: 'p3' });
    h.advanceTo('GAME_OVER');
    expect(knownRoles(projectFor(h.state, 'p6'))).toHaveLength(6);
  });

  it('never leaks hidden information at any point of a full game', () => {
    const h = new Harness();
    assertNoLeakForAll(h);
    h.advanceTo('NIGHT');
    h.act('p1', { type: 'WOLF_VOTE', targetId: 'p7' });
    assertNoLeakForAll(h);
    h.act('p2', { type: 'WOLF_VOTE', targetId: 'p7' });
    h.act('p3', { type: 'SEER_CHECK', targetId: 'p1' });
    h.act('p4', { type: 'GUARD_PROTECT', targetId: 'p8' });
    assertNoLeakForAll(h); // witch step
    h.act('p5', { type: 'WITCH_ACT', heal: false, poisonTargetId: null });
    assertNoLeakForAll(h); // dawn
    h.vote({ p3: 'p1', p4: 'p1', p5: 'p1' });
    assertNoLeakForAll(h); // defense
    h.night({ kill: 'p6' });
    h.advanceTo('HUNTER_SHOT');
    assertNoLeakForAll(h);
    h.act('p6', { type: 'HUNTER_SHOOT', targetId: 'p2' });
    expect(h.phase).toBe('GAME_OVER');
    assertNoLeakForAll(h);
  });
});
