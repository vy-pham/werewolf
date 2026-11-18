import type { GameCommand, RuleError } from '@werewolf/shared';
import { resolveHunterShot } from '../phases';
import { ruleError } from '../state';
import type { GameState, PlayerState, Tx } from '../types';
import { checkTarget, firstError, requirePhase } from './common';

type Cmd = Extract<GameCommand, { type: 'HUNTER_SHOOT' }>;

/** The (already dead) hunter picks someone to take down with them. */
export function validateHunter(s: GameState, actor: PlayerState, cmd: Cmd): RuleError | null {
  return firstError(
    () => requirePhase(s, 'HUNTER_SHOT'),
    () =>
      s.hunter.pendingId === actor.id
        ? null
        : ruleError('NOT_YOUR_TURN', 'Only the dying hunter can shoot'),
    () => checkTarget(s, actor, cmd.targetId),
  );
}

export function applyHunter(tx: Tx, _actor: PlayerState, cmd: Cmd) {
  resolveHunterShot(tx, cmd.targetId);
}
