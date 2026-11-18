import type { GameCommand, RuleError } from '@werewolf/shared';
import { emit, ruleError, WOLVES, wolvesMayKill } from '../state';
import type { GameState, PlayerState, Tx } from '../types';
import { checkTarget, firstError, requireAlive, requirePhase, requireRole } from './common';

type Cmd = Extract<GameCommand, { type: 'WOLF_VOTE' }>;

/** Wolves may change their vote until night step 1 ends. */
export function validateWolfVote(s: GameState, actor: PlayerState, cmd: Cmd): RuleError | null {
  return firstError(
    () => requirePhase(s, 'NIGHT', 1),
    () => requireAlive(actor),
    () => requireRole(actor, 'werewolf'),
    () => (wolvesMayKill(s) ? null : ruleError('NOT_YOUR_TURN', 'No kill on the first night')),
    () => checkTarget(s, actor, cmd.targetId, { allowWolves: false }),
  );
}

export function applyWolfVote(tx: Tx, actor: PlayerState, cmd: Cmd) {
  tx.s.night.wolfVotes[actor.id] = cmd.targetId;
  emit(tx, 'WOLF_VOTE_CAST', WOLVES, { wolfId: actor.id, targetId: cmd.targetId });
}
