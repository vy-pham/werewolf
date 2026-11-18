import type { GameCommand, RuleError } from '@werewolf/shared';
import { finishNightStep, nightStepComplete } from '../phases';
import type { PlayerState, Tx } from '../types';
import { applyDayVote, validateDayVote } from './day-vote';
import { applyGuard, validateGuard } from './guard';
import { applyHunter, validateHunter } from './hunter';
import { applySeer, validateSeer } from './seer';
import { applyWolfVote, validateWolfVote } from './werewolf';
import { applyWitch, validateWitch } from './witch';

/** Validates and applies one player command. Returns an error and leaves `tx` untouched on failure. */
export function runCommand(tx: Tx, actor: PlayerState, cmd: GameCommand): RuleError | null {
  const { s } = tx;
  switch (cmd.type) {
    case 'WOLF_VOTE': {
      const e = validateWolfVote(s, actor, cmd);
      if (e) return e;
      applyWolfVote(tx, actor, cmd);
      break;
    }
    case 'GUARD_PROTECT': {
      const e = validateGuard(s, actor, cmd);
      if (e) return e;
      applyGuard(tx, actor, cmd);
      break;
    }
    case 'SEER_CHECK': {
      const e = validateSeer(s, actor, cmd);
      if (e) return e;
      applySeer(tx, actor, cmd);
      break;
    }
    case 'WITCH_ACT': {
      const e = validateWitch(s, actor, cmd);
      if (e) return e;
      applyWitch(tx, actor, cmd);
      break;
    }
    case 'DAY_VOTE': {
      const e = validateDayVote(s, actor, cmd);
      if (e) return e;
      applyDayVote(tx, actor, cmd);
      return null;
    }
    case 'HUNTER_SHOOT': {
      const e = validateHunter(s, actor, cmd);
      if (e) return e;
      applyHunter(tx, actor, cmd);
      return null;
    }
  }
  // Night actions: move on as soon as everyone who must act has acted.
  if (s.phase.name === 'NIGHT' && nightStepComplete(s)) finishNightStep(tx);
  return null;
}
