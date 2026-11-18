export const TEAMS = ['village', 'wolves'] as const;
export type Team = (typeof TEAMS)[number];

/** MVP roles. Release 2 roles are listed in docs/04-game-rules.md. */
export const ROLE_IDS = ['villager', 'werewolf', 'seer', 'guard', 'witch', 'hunter'] as const;
export type RoleId = (typeof ROLE_IDS)[number];

export const ROLE_TEAM: Record<RoleId, Team> = {
  villager: 'village',
  werewolf: 'wolves',
  seer: 'village',
  guard: 'village',
  witch: 'village',
  hunter: 'village',
};

/** Roles that may appear more than once in a game. Every other role is limited to one player. */
export const STACKABLE_ROLES: readonly RoleId[] = ['villager', 'werewolf'];

export const MIN_PLAYERS = 6;
export const MAX_PLAYERS = 16;

export type RoleCounts = Partial<Record<RoleId, number>>;

/** Role presets by player count (docs/04-game-rules.md §3). */
export const ROLE_PRESETS: Readonly<Record<number, RoleCounts>> = {
  6: { werewolf: 2, seer: 1, guard: 1, villager: 2 },
  7: { werewolf: 2, seer: 1, guard: 1, witch: 1, villager: 2 },
  8: { werewolf: 2, seer: 1, guard: 1, witch: 1, hunter: 1, villager: 2 },
  9: { werewolf: 2, seer: 1, guard: 1, witch: 1, hunter: 1, villager: 3 },
  10: { werewolf: 3, seer: 1, guard: 1, witch: 1, hunter: 1, villager: 3 },
  12: { werewolf: 3, seer: 1, guard: 1, witch: 1, hunter: 1, villager: 5 },
  14: { werewolf: 4, seer: 1, guard: 1, witch: 1, hunter: 1, villager: 6 },
  16: { werewolf: 4, seer: 1, guard: 1, witch: 1, hunter: 1, villager: 8 },
};
