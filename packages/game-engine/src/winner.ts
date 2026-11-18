import { ROLE_TEAM, type RoleId, type Team } from '@werewolf/shared';

export interface PlayerLike {
  role: RoleId;
  alive: boolean;
}

/**
 * Win check (docs/04-game-rules.md §1). Village wins when no wolf is alive; wolves win when alive
 * wolves ≥ alive non-wolves. If both hold at once, village wins.
 */
export function checkWinner(players: readonly PlayerLike[]): Team | null {
  const alive = players.filter((p) => p.alive);
  const wolves = alive.filter((p) => ROLE_TEAM[p.role] === 'wolves').length;
  const others = alive.length - wolves;
  if (wolves === 0) return 'village';
  if (wolves >= others) return 'wolves';
  return null;
}
