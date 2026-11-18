import type { GameCommand, RuleError } from '@werewolf/shared';
import { ALL, canVote, emit, ruleError } from '../state';
import type { GameState, PlayerState, Tx } from '../types';
import { checkTarget, firstError, requireAlive, requirePhase } from './common';

type Cmd = Extract<GameCommand, { type: 'DAY_VOTE' }>;

/** Public vote. Players may change it until the timer ends; `null` = skip. */
export function validateDayVote(s: GameState, actor: PlayerState, cmd: Cmd): RuleError | null {
  return firstError(
    () => requirePhase(s, 'VOTE'),
    () => requireAlive(actor),
    () => (canVote(s, actor) ? null : ruleError('NOT_YOUR_TURN', 'A revealed fool cannot vote')),
    () => checkTarget(s, actor, cmd.targetId, { candidates: s.day.candidates }),
  );
}

export function applyDayVote(tx: Tx, actor: PlayerState, cmd: Cmd) {
  tx.s.day.votes[actor.id] = cmd.targetId;
  emit(tx, 'VOTE_CAST', ALL, { voterId: actor.id, targetId: cmd.targetId });
}
