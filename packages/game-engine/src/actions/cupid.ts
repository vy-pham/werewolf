import type { GameCommand, RuleError } from '@werewolf/shared';
import { emit, findPlayer, ruleError, toPlayer } from '../state';
import type { GameState, PlayerState, Tx } from '../types';
import {
  checkTarget,
  firstError,
  requireAlive,
  requireNotSubmitted,
  requirePhase,
  requireRole,
} from './common';

type Cmd = Extract<GameCommand, { type: 'CUPID_LINK' }>;

/** Night 1 only: two different living players (Cupid may pick themself), or `null` to skip. */
export function validateCupid(s: GameState, actor: PlayerState, cmd: Cmd): RuleError | null {
  const [a, b] = cmd.targetIds ?? [null, null];
  return firstError(
    () => requirePhase(s, 'NIGHT', 1),
    () => (s.round === 1 ? null : ruleError('NOT_YOUR_TURN', 'Cupid only acts on night 1')),
    () => requireAlive(actor),
    () => requireRole(actor, 'cupid'),
    () => requireNotSubmitted(s, actor),
    () =>
      a !== null && a === b ? ruleError('INVALID_TARGET', 'Pick two different players') : null,
    () => checkTarget(s, actor, a, { allowSelf: true }),
    () => checkTarget(s, actor, b, { allowSelf: true }),
  );
}

/** Links the couple; each lover learns who their partner is (and their role). */
export function applyCupid(tx: Tx, actor: PlayerState, cmd: Cmd) {
  const { s } = tx;
  s.night.submitted.push(actor.id);
  emit(tx, 'NIGHT_ACTION_ACCEPTED', toPlayer(actor.id), { type: cmd.type });
  if (!cmd.targetIds) return;
  const [a, b] = cmd.targetIds.map((id) => findPlayer(s, id));
  if (!a || !b) return;
  s.memory.lovers = [a.id, b.id];
  emit(tx, 'CUPID_LINKED', toPlayer(actor.id), { loverIds: [a.id, b.id] });
  emit(tx, 'LOVER_ASSIGNED', toPlayer(a.id), { partnerId: b.id, partnerRole: b.role });
  emit(tx, 'LOVER_ASSIGNED', toPlayer(b.id), { partnerId: a.id, partnerRole: a.role });
}
