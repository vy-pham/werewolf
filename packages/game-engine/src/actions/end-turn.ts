import type { RuleError } from '@werewolf/shared';
import { currentSpeaker, nextSpeaker } from '../phases';
import { ruleError } from '../state';
import type { GameState, PlayerState, Tx } from '../types';
import { firstError, requirePhase } from './common';

/** Only the player holding the floor can end their DISCUSSION turn early. */
export function validateEndTurn(s: GameState, actor: PlayerState): RuleError | null {
  return firstError(
    () => requirePhase(s, 'DISCUSSION'),
    () =>
      currentSpeaker(s) === actor.id
        ? null
        : ruleError('NOT_YOUR_TURN', 'Only the current speaker can end the turn'),
  );
}

export function applyEndTurn(tx: Tx) {
  nextSpeaker(tx);
}
