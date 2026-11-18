import type { PhaseName, RoleId, RuleError } from '@werewolf/shared';
import { findPlayer, isWolf, ruleError } from '../state';
import type { GameState, PlayerState } from '../types';

export function requirePhase(s: GameState, name: PhaseName, step?: number): RuleError | null {
  if (s.phase.name !== name || (step !== undefined && s.phase.step !== step)) {
    return ruleError('NOT_YOUR_TURN', `This action is only allowed during ${name}`);
  }
  return null;
}

export function requireAlive(actor: PlayerState): RuleError | null {
  return actor.alive ? null : ruleError('PLAYER_DEAD', 'Dead players cannot act');
}

export function requireRole(actor: PlayerState, role: RoleId): RuleError | null {
  return actor.role === role ? null : ruleError('NOT_YOUR_TURN', `Only the ${role} can do this`);
}

export function requireNotSubmitted(s: GameState, actor: PlayerState): RuleError | null {
  return s.night.submitted.includes(actor.id)
    ? ruleError('CONFLICT', 'You already acted this night')
    : null;
}

interface TargetOptions {
  allowSelf?: boolean;
  allowWolves?: boolean;
  candidates?: string[] | null;
}

/** `null` (skip) is always valid; otherwise the target must be a living player. */
export function checkTarget(
  s: GameState,
  actor: PlayerState,
  targetId: string | null,
  { allowSelf = false, allowWolves = true, candidates = null }: TargetOptions = {},
): RuleError | null {
  if (targetId === null) return null;
  const target = findPlayer(s, targetId);
  if (!target?.alive) return ruleError('INVALID_TARGET', 'Target must be alive');
  if (!allowSelf && target.id === actor.id) {
    return ruleError('INVALID_TARGET', 'You cannot target yourself');
  }
  if (!allowWolves && isWolf(target)) {
    return ruleError('INVALID_TARGET', 'Wolves cannot target a wolf');
  }
  if (candidates && !candidates.includes(target.id)) {
    return ruleError('INVALID_TARGET', 'Target is not one of the candidates');
  }
  return null;
}

/** Returns the first error, or null. */
export const firstError = (...checks: Array<() => RuleError | null>): RuleError | null => {
  for (const check of checks) {
    const error = check();
    if (error) return error;
  }
  return null;
};
