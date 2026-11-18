import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  ROLE_IDS,
  ROLE_PRESETS,
  type RoleCounts,
  STACKABLE_ROLES,
} from '@werewolf/shared';

export type RoleSetError =
  | { code: 'PLAYER_COUNT_OUT_OF_RANGE'; min: number; max: number }
  | { code: 'ROLE_COUNT_MISMATCH'; expected: number; actual: number }
  | { code: 'INVALID_WOLF_COUNT'; wolves: number }
  | { code: 'UNIQUE_ROLE_DUPLICATED'; role: string };

export const totalRoles = (roles: RoleCounts): number =>
  ROLE_IDS.reduce((sum, id) => sum + (roles[id] ?? 0), 0);

/** Validation rules from docs/04-game-rules.md §3. Returns every problem found. */
export function validateRoleSet(roles: RoleCounts, playerCount: number): RoleSetError[] {
  const errors: RoleSetError[] = [];
  if (playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    errors.push({ code: 'PLAYER_COUNT_OUT_OF_RANGE', min: MIN_PLAYERS, max: MAX_PLAYERS });
  }
  const total = totalRoles(roles);
  if (total !== playerCount) {
    errors.push({ code: 'ROLE_COUNT_MISMATCH', expected: playerCount, actual: total });
  }
  const wolves = roles.werewolf ?? 0;
  if (wolves < 1 || wolves >= playerCount / 2) {
    errors.push({ code: 'INVALID_WOLF_COUNT', wolves });
  }
  for (const id of ROLE_IDS) {
    if (!STACKABLE_ROLES.includes(id) && (roles[id] ?? 0) > 1) {
      errors.push({ code: 'UNIQUE_ROLE_DUPLICATED', role: id });
    }
  }
  return errors;
}

/**
 * Preset for a player count. Counts without an exact preset (11, 13, 15) use the nearest lower
 * preset and fill the difference with villagers.
 */
export function presetFor(playerCount: number): RoleCounts {
  const clamped = Math.min(Math.max(playerCount, MIN_PLAYERS), MAX_PLAYERS);
  let base = clamped;
  while (!ROLE_PRESETS[base]) base--;
  const preset = { ...ROLE_PRESETS[base] };
  preset.villager = (preset.villager ?? 0) + (clamped - base);
  return preset;
}
