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
        { role: 'werewolf', alive: false },
        { role: 'villager', alive: true },
      ]),
    ).toBe('village');
  });

  it('wolves win at parity', () => {
    expect(
      checkWinner([
        { role: 'werewolf', alive: true },
        { role: 'seer', alive: true },
        { role: 'villager', alive: false },
      ]),
    ).toBe('wolves');
  });

  it('game continues otherwise', () => {
    expect(
      checkWinner([
        { role: 'werewolf', alive: true },
        { role: 'seer', alive: true },
        { role: 'villager', alive: true },
      ]),
    ).toBeNull();
  });
});
