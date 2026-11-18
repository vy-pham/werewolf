import type { GameCommand, RuleError } from '@werewolf/shared';
import { emit, isWolf, ruleError, WOLVES, wolvesMayKill } from '../state';
import type { GameState, PlayerState, Tx } from '../types';
import { checkTarget, firstError, requireAlive, requirePhase } from './common';

type Cmd = Extract<GameCommand, { type: 'WOLF_VOTE' }>;

/**
 * Wolves (werewolf, alpha_wolf) may change their vote until night step 1 ends. The alpha may add
 * `infect: true` (once per game) to convert the victim instead of killing them.
 */
export function validateWolfVote(s: GameState, actor: PlayerState, cmd: Cmd): RuleError | null {
  return firstError(
    () => requirePhase(s, 'NIGHT', 1),
    () => requireAlive(actor),
    () => (isWolf(actor) ? null : ruleError('NOT_YOUR_TURN', 'Only wolves can do this')),
    () => {
      if (!cmd.infect) return null;
      if (actor.role !== 'alpha_wolf') return ruleError('NOT_YOUR_TURN', 'Only the alpha infects');
      return s.memory.infection ? ruleError('ABILITY_USED', 'Infection already used') : null;
    },
    () => (wolvesMayKill(s) ? null : ruleError('NOT_YOUR_TURN', 'No kill on the first night')),
    () => checkTarget(s, actor, cmd.targetId, { allowWolves: false }),
  );
}

export function applyWolfVote(tx: Tx, actor: PlayerState, cmd: Cmd) {
  tx.s.night.wolfVotes[actor.id] = cmd.targetId;
  if (actor.role === 'alpha_wolf') tx.s.night.alphaInfect = cmd.infect === true;
  emit(tx, 'WOLF_VOTE_CAST', WOLVES, { wolfId: actor.id, targetId: cmd.targetId });
}
