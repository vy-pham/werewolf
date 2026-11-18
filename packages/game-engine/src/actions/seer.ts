import type { GameCommand, RuleError } from '@werewolf/shared';
import { emit, findPlayer, isWolf, toPlayer } from '../state';
import type { GameState, PlayerState, Tx } from '../types';
import {
  checkTarget,
  firstError,
  requireAlive,
  requireNotSubmitted,
  requirePhase,
  requireRole,
} from './common';

type Cmd = Extract<GameCommand, { type: 'SEER_CHECK' }>;

export function validateSeer(s: GameState, actor: PlayerState, cmd: Cmd): RuleError | null {
  return firstError(
    () => requirePhase(s, 'NIGHT', 1),
    () => requireAlive(actor),
    () => requireRole(actor, 'seer'),
    () => requireNotSubmitted(s, actor),
    () => checkTarget(s, actor, cmd.targetId),
  );
}

/** The seer learns the answer immediately, privately. */
export function applySeer(tx: Tx, actor: PlayerState, cmd: Cmd) {
  const { s } = tx;
  s.night.submitted.push(actor.id);
  s.night.seerTargetId = cmd.targetId;
  emit(tx, 'NIGHT_ACTION_ACCEPTED', toPlayer(actor.id), { type: cmd.type });
  const target = findPlayer(s, cmd.targetId);
  if (!target) return;
  const result = { round: s.round, targetId: target.id, isWolf: isWolf(target) };
  s.memory.seerResults.push(result);
  emit(tx, 'SEER_RESULT', toPlayer(actor.id), result);
}
