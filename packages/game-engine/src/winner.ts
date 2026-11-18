import { isWolfRole, type RoleId, type Team } from '@werewolf/shared';

export interface PlayerLike {
  id: string;
  role: RoleId;
  alive: boolean;
}

/**
 * Win check (docs/04-game-rules.md §1).
 * - A couple from different teams (`lovers`) wins when they are the last two alive.
 * - Village wins when no wolf is alive.
 * - Wolves win when alive wolves ≥ alive non-wolves. A wolf who is in a mixed couple does not
 *   count as a wolf for this (they play for the couple).
 * If village and wolves hold at once, village wins.
 */
export function checkWinner(
  players: readonly PlayerLike[],
  lovers: readonly [string, string] | null = null,
): Team | null {
  const alive = players.filter((p) => p.alive);
  const couple = lovers ? alive.filter((p) => lovers.includes(p.id)) : [];
  const mixed = couple.length === 2 && isWolfRole(couple[0]?.role) !== isWolfRole(couple[1]?.role);
  if (mixed && alive.length === 2) return 'lovers';

  const wolves = alive.filter((p) => isWolfRole(p.role));
  if (wolves.length === 0) return 'village';
  const pack = mixed ? wolves.filter((p) => !lovers?.includes(p.id)).length : wolves.length;
  if (pack > 0 && pack >= alive.length - pack) return 'wolves';
  return null;
}
