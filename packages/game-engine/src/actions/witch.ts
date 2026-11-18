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

type Cmd = Extract<GameCommand, { type: 'WITCH_ACT' }>;

/** One submission per night: heal the wolves' victim and/or poison someone, or neither (skip). */
export function validateWitch(s: GameState, actor: PlayerState, cmd: Cmd): RuleError | null {
  const victimId = s.night.wolfTargetId;
  return firstError(
    () => requirePhase(s, 'NIGHT', 2),
    () => requireAlive(actor),
    () => requireRole(actor, 'witch'),
    () => requireNotSubmitted(s, actor),
    () => {
      if (!cmd.heal) return null;
      if (s.memory.witchHealUsed) return ruleError('ABILITY_USED', 'Heal potion already used');
      if (!victimId) return ruleError('INVALID_TARGET', 'Nobody was attacked tonight');
      if (victimId === actor.id && !s.rules.witchCanSelfHeal) {
        return ruleError('INVALID_TARGET', 'The witch cannot heal herself in this room');
      }
      return null;
    },
    () => {
      if (cmd.poisonTargetId === null) return null;
      if (s.memory.witchPoisonUsed) return ruleError('ABILITY_USED', 'Poison already used');
      return checkTarget(s, actor, cmd.poisonTargetId);
    },
    () =>
      cmd.heal && cmd.poisonTargetId !== null && s.rules.witchOnePotionPerNight
        ? ruleError('INVALID_TARGET', 'Only one potion per night in this room')
        : null,
  );
}

export function applyWitch(tx: Tx, actor: PlayerState, cmd: Cmd) {
  tx.s.night.submitted.push(actor.id);
  tx.s.night.witchHeal = cmd.heal;
  tx.s.night.witchPoisonId = cmd.poisonTargetId;
  emit(tx, 'NIGHT_ACTION_ACCEPTED', toPlayer(actor.id), { type: cmd.type });
}
