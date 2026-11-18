import type { RoleId } from '@werewolf/shared';
import { describe, expect, it } from 'vitest';
import { projectFor } from '../projection';
import { validateRoleSet } from '../role-set';
import { startingRole } from '../state';
import { voicePermissions } from '../voice';
import { Harness } from './harness';

const ofType = (h: Harness, type: string) => h.events.filter((e) => e.type === type);

// ── Cupid ────────────────────────────────────────────────────────────────────

// p1 W, p2 W, p3 seer, p4 cupid, p5..p8 villagers
const CUPID_8: RoleId[] = [
  'werewolf',
  'werewolf',
  'seer',
  'cupid',
  'villager',
  'villager',
  'villager',
  'villager',
];

describe('cupid', () => {
  it('links a couple on night 1; each lover learns the partner and their role', () => {
    const h = new Harness(CUPID_8);
    h.night({ cupid: ['p1', 'p5'] });
    expect(h.state.memory.lovers).toEqual(['p1', 'p5']);
    expect(ofType(h, 'CUPID_LINKED')).toEqual([
      expect.objectContaining({ audience: { kind: 'player', playerId: 'p4' } }),
    ]);
    expect(ofType(h, 'LOVER_ASSIGNED').map((e) => [e.audience, e.payload])).toEqual([
      [
        { kind: 'player', playerId: 'p1' },
        { partnerId: 'p5', partnerRole: 'villager' },
      ],
      [
        { kind: 'player', playerId: 'p5' },
        { partnerId: 'p1', partnerRole: 'werewolf' },
      ],
    ]);

    // A wolf + a villager: they play for themselves now.
    const lover = projectFor(h.state, 'p5');
    expect(lover.me).toMatchObject({ team: 'lovers', partnerId: 'p1' });
    expect(lover.players.find((p) => p.id === 'p1')?.role).toBe('werewolf');
    expect(projectFor(h.state, 'p4').me?.cupidLinked).toEqual(['p1', 'p5']);
    // Nobody else learns anything.
    const other = projectFor(h.state, 'p6');
    expect(other.me?.partnerId).toBeUndefined();
    expect(other.lovers).toBeNull(); // revealed only at GAME_OVER
    expect(other.players.find((p) => p.id === 'p1')?.role).toBeNull();
  });

  it('night 1 waits for Cupid; Cupid acts only on night 1', () => {
    const h = new Harness(CUPID_8);
    h.advanceTo('NIGHT', 1);
    h.act('p1', { type: 'WOLF_VOTE', targetId: null });
    h.act('p2', { type: 'WOLF_VOTE', targetId: null });
    h.act('p3', { type: 'SEER_CHECK', targetId: null });
    expect(h.step).toBe(1); // still waiting for Cupid
    expect(projectFor(h.state, 'p4').me?.pendingAction).toBe('CUPID_LINK');
    h.act('p4', { type: 'CUPID_LINK', targetIds: ['p4', 'p6'] }); // Cupid may pick themself
    expect(h.phase).toBe('DAWN');

    h.advanceTo('NIGHT', 1);
    expect(projectFor(h.state, 'p4').me?.pendingAction).toBeNull();
    expect(h.tryAct('p4', { type: 'CUPID_LINK', targetIds: ['p5', 'p6'] })?.code).toBe(
      'NOT_YOUR_TURN',
    );
  });

  it('rejects the same player twice', () => {
    const h = new Harness(CUPID_8);
    h.advanceTo('NIGHT', 1);
    expect(h.tryAct('p4', { type: 'CUPID_LINK', targetIds: ['p5', 'p5'] })?.code).toBe(
      'INVALID_TARGET',
    );
  });

  it('a lover dies of a broken heart when the partner dies', () => {
    const h = new Harness(CUPID_8);
    h.night({ cupid: ['p5', 'p6'], kill: 'p5' });
    expect(h.player('p5').death?.cause).toBe('wolves');
    expect(h.player('p6').death?.cause).toBe('heartbreak');
  });

  it('a mixed couple wins when they are the last two alive', () => {
    // p1 W, p2 W, p3 cupid, p4..p6 villagers
    const h = new Harness(['werewolf', 'werewolf', 'cupid', 'villager', 'villager', 'villager'], {
      timers: { defenseSeconds: 0 },
    });
    h.night({ cupid: ['p1', 'p4'], kill: 'p3' });
    h.vote({ p1: 'p2', p4: 'p2', p5: 'p2', p6: 'p2' });
    h.timeout(); // EXECUTION → night 2
    expect(h.isAlive('p2')).toBe(false);
    expect(h.phase).toBe('NIGHT'); // p1 (wolf lover) is alive: the village has not won
    h.night({ kill: 'p5' });
    h.vote({ p1: 'p6', p4: 'p6' });
    h.timeout();
    expect(h.phase).toBe('GAME_OVER');
    expect(h.state.winner).toBe('lovers');
    expect(projectFor(h.state, 'p5').lovers).toEqual(['p1', 'p4']);
    expect(ofType(h, 'GAME_OVER')[0]?.payload).toMatchObject({
      winner: 'lovers',
      lovers: ['p1', 'p4'],
    });
  });
});

// ── Alpha wolf ───────────────────────────────────────────────────────────────

// p1 alpha, p2 W, p3 seer, p4 guard, p5 witch, p6..p8 villagers
const ALPHA_8: RoleId[] = [
  'alpha_wolf',
  'werewolf',
  'seer',
  'guard',
  'witch',
  'villager',
  'villager',
  'villager',
];

describe('alpha wolf', () => {
  it('infects the victim instead of killing; the witch sees nobody', () => {
    const h = new Harness(ALPHA_8);
    h.night({ kill: 'p6', infect: true });
    expect(ofType(h, 'WITCH_INFO')[0]?.payload).toEqual({ victimId: null });
    expect(h.isAlive('p6')).toBe(true);
    expect(h.player('p6').role).toBe('werewolf');
    expect(startingRole(h.state, h.player('p6'))).toBe('villager');
    expect(ofType(h, 'NO_DEATHS')).toHaveLength(1);
    expect(ofType(h, 'INFECTED')[0]).toMatchObject({
      audience: { kind: 'player', playerId: 'p6' },
      payload: { wolfTeam: ['p1', 'p2', 'p6'] },
    });
    expect(ofType(h, 'WOLF_JOINED')[0]?.payload).toEqual({ playerId: 'p6' });
    expect(projectFor(h.state, 'p1').me?.alpha).toEqual({ infectUsed: true, infectTonight: true });

    // Next night the new wolf votes with the pack and talks on the wolves' channel.
    h.advanceTo('NIGHT', 1);
    expect(projectFor(h.state, 'p6').me?.pendingAction).toBe('WOLF_VOTE');
    expect(voicePermissions(h.state, 'p6').wolves?.publish).toBe(true);
    expect(h.tryAct('p1', { type: 'WOLF_VOTE', targetId: 'p7', infect: true })?.code).toBe(
      'ABILITY_USED',
    );
  });

  it('the guard blocks the infection, and the alpha keeps it', () => {
    const h = new Harness(ALPHA_8);
    h.night({ kill: 'p6', infect: true, guard: 'p6' });
    expect(h.player('p6').role).toBe('villager');
    expect(h.state.memory.infection).toBeNull();
  });

  it('only the alpha can infect', () => {
    const h = new Harness(ALPHA_8);
    h.advanceTo('NIGHT', 1);
    expect(h.tryAct('p2', { type: 'WOLF_VOTE', targetId: 'p6', infect: true })?.code).toBe(
      'NOT_YOUR_TURN',
    );
  });

  it('an infected seer: the night still waits for the timer (no leak)', () => {
    const h = new Harness(ALPHA_8);
    h.night({ kill: 'p3', infect: true });
    expect(h.player('p3').role).toBe('werewolf');
    h.advanceTo('NIGHT', 1);
    for (const w of ['p1', 'p2', 'p3']) h.act(w, { type: 'WOLF_VOTE', targetId: null });
    h.act('p4', { type: 'GUARD_PROTECT', targetId: null });
    expect(h.step).toBe(1);
  });
});

// ── Fool & elder ─────────────────────────────────────────────────────────────

// p1 W, p2 W, p3 seer, p4 fool, p5 elder, p6..p8 villagers
const FOOL_ELDER_8: RoleId[] = [
  'werewolf',
  'werewolf',
  'seer',
  'fool',
  'elder',
  'villager',
  'villager',
  'villager',
];

describe('fool', () => {
  it('survives the first execution, is revealed, and can no longer vote', () => {
    const h = new Harness(FOOL_ELDER_8, { timers: { defenseSeconds: 0 } });
    h.night({});
    h.vote({ p1: 'p4', p2: 'p4', p3: 'p4' });
    expect(h.phase).toBe('EXECUTION');
    expect(h.isAlive('p4')).toBe(true);
    expect(ofType(h, 'FOOL_REVEALED')[0]?.payload).toEqual({ playerId: 'p4' });
    expect(projectFor(h.state, 'p7').players.find((p) => p.id === 'p4')?.role).toBe('fool');

    h.night({});
    h.advanceTo('VOTE');
    expect(projectFor(h.state, 'p4').me).toMatchObject({ pendingAction: null, canVote: false });
    expect(h.tryAct('p4', { type: 'DAY_VOTE', targetId: 'p1' })?.code).toBe('NOT_YOUR_TURN');
    h.act('p1', { type: 'DAY_VOTE', targetId: 'p4' });
    h.timeout();
    expect(h.player('p4').death?.cause).toBe('execution'); // the second time is fatal
  });

  it('dies normally at night', () => {
    const h = new Harness(FOOL_ELDER_8);
    h.night({ kill: 'p4' });
    expect(h.isAlive('p4')).toBe(false);
  });
});

describe('elder', () => {
  it('survives the first bite (only the elder is told), not the second', () => {
    const h = new Harness(FOOL_ELDER_8);
    h.night({ kill: 'p5' });
    expect(h.isAlive('p5')).toBe(true);
    expect(ofType(h, 'NO_DEATHS')).toHaveLength(1);
    expect(ofType(h, 'ELDER_SURVIVED')).toEqual([
      expect.objectContaining({ audience: { kind: 'player', playerId: 'p5' } }),
    ]);
    h.night({ kill: 'p5' });
    expect(h.player('p5').death?.cause).toBe('wolves');
  });

  it('dies when executed', () => {
    const h = new Harness(FOOL_ELDER_8, { timers: { defenseSeconds: 0 } });
    h.night({});
    h.vote({ p1: 'p5', p2: 'p5' });
    expect(h.isAlive('p5')).toBe(false);
  });
});

describe('role set with M7 roles', () => {
  it('the alpha counts as a wolf; new special roles are unique', () => {
    expect(validateRoleSet({ alpha_wolf: 1, villager: 5 }, 6)).toEqual([]);
    expect(validateRoleSet({ werewolf: 2, alpha_wolf: 1, villager: 3 }, 6)).toEqual([
      { code: 'INVALID_WOLF_COUNT', wolves: 3 },
    ]);
    expect(validateRoleSet({ werewolf: 1, cupid: 2, villager: 3 }, 6)).toEqual([
      { code: 'UNIQUE_ROLE_DUPLICATED', role: 'cupid' },
    ]);
  });
});
