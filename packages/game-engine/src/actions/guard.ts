import type { GameCommand, RuleError } from '@werewolf/shared';
import { emit, ruleError, toPlayer } from '../state';
import type { GameState, PlayerState, Tx } from '../types';
import {
  checkTarget,
  firstError,
  requireAlive,
  requireNotSubmitted,
  requirePhase,
  requireRole,
} from './common';

type Cmd = Extract<GameCommand, { type: 'GUARD_PROTECT' }>;

export function validateGuard(s: GameState, actor: PlayerState, cmd: Cmd): RuleError | null {
  return firstError(
    () => requirePhase(s, 'NIGHT', 1),
    () => requireAlive(actor),
    () => requireRole(actor, 'guard'),
    () => requireNotSubmitted(s, actor),
    () => checkTarget(s, actor, cmd.targetId, { allowSelf: s.rules.guardCanSelfProtect }),
    () =>
      cmd.targetId !== null && cmd.targetId === s.memory.guardLastTargetId
        ? ruleError('INVALID_TARGET', 'Cannot protect the same player two nights in a row')
        : null,
  );
}

export function applyGuard(tx: Tx, actor: PlayerState, cmd: Cmd) {
  tx.s.night.submitted.push(actor.id);
  tx.s.night.guardTargetId = cmd.targetId;
  emit(tx, 'NIGHT_ACTION_ACCEPTED', toPlayer(actor.id), { type: cmd.type });
}
