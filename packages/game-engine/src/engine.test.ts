import type { RoleId } from '@werewolf/shared';
import { MAX_PLAYERS, MIN_PLAYERS, ROLE_PRESETS } from '@werewolf/shared';
import { describe, expect, it } from 'vitest';
import { presetFor, totalRoles, validateRoleSet } from './role-set';
import { checkWinner } from './winner';

describe('role presets', () => {
  it.each(Object.entries(ROLE_PRESETS))('preset for %s players is valid', (count, roles) => {
    expect(validateRoleSet(roles, Number(count))).toEqual([]);
  });

  it('fills counts without a preset with villagers', () => {
    for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
      const preset = presetFor(n);
      expect(totalRoles(preset)).toBe(n);
      expect(validateRoleSet(preset, n)).toEqual([]);
    }
  });
});

describe('validateRoleSet', () => {
  it('rejects too many wolves, duplicated unique roles and count mismatch', () => {
    const codes = validateRoleSet({ werewolf: 3, seer: 2, villager: 0 }, 6).map((e) => e.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        'INVALID_WOLF_COUNT',
        'UNIQUE_ROLE_DUPLICATED',
        'ROLE_COUNT_MISMATCH',
      ]),
    );
  });
});

describe('checkWinner', () => {
  it('village wins when every wolf is dead', () => {
    expect(
      checkWinner([
        { id: 'p1', role: 'werewolf', alive: false },
        { id: 'p2', role: 'villager', alive: true },
      ]),
    ).toBe('village');
  });

  it('wolves win at parity', () => {
    expect(
      checkWinner([
        { id: 'p3', role: 'werewolf', alive: true },
        { id: 'p4', role: 'seer', alive: true },
        { id: 'p5', role: 'villager', alive: false },
      ]),
    ).toBe('wolves');
  });

  it('game continues otherwise', () => {
    expect(
      checkWinner([
        { id: 'p6', role: 'werewolf', alive: true },
        { id: 'p7', role: 'seer', alive: true },
        { id: 'p8', role: 'villager', alive: true },
      ]),
    ).toBeNull();
  });

  const p = (id: string, role: RoleId, alive = true) => ({ id, role, alive });

  it('a mixed couple wins when they are the last two alive', () => {
    expect(
      checkWinner([p('w', 'werewolf'), p('v', 'villager'), p('x', 'seer', false)], ['w', 'v']),
    ).toBe('lovers');
  });

  it('with a mixed couple alive, the wolf lover does not count for the pack', () => {
    const players = [p('w', 'werewolf'), p('v', 'villager'), p('w2', 'werewolf'), p('s', 'seer')];
    // pack = 1 (w2) vs 3 others: no winner; without the couple it would be 2 vs 2 = wolves.
    expect(checkWinner(players, ['w', 'v'])).toBeNull();
    expect(checkWinner(players)).toBe('wolves');
    // a couple from the same team changes nothing
    expect(checkWinner(players, ['w', 'w2'])).toBe('wolves');
  });

  it('the alpha wolf counts as a wolf', () => {
    expect(checkWinner([p('a', 'alpha_wolf'), p('v', 'villager')])).toBe('wolves');
  });
});
