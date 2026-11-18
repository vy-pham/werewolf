import {
  CAPTION_LANGS,
  type CaptionLang,
  type DeliveredGameEvent,
  type GameCommandType,
  isWolfRole,
  type PlayerView,
  type RoomRules,
  type UserView,
} from '@werewolf/shared';
import type { TFunction } from 'i18next';

/** UI helpers shared by web and mobile. Hints only: the server engine is the authority. */

/** Which players can be tapped as a target right now (obviously invalid cards are disabled). */
export function targetable(view: PlayerView, rules: RoomRules | undefined, id: string): boolean {
  const me = view.me;
  const action = me?.pendingAction;
  if (!me || !action || action === 'END_TURN') return false;
  if (me.submitted && action !== 'WOLF_VOTE' && action !== 'DAY_VOTE') return false;
  const target = view.players.find((p) => p.id === id);
  if (!target?.alive) return false;
  const self = id === me.id;
  switch (action) {
    case 'WOLF_VOTE':
      return !isWolfRole(target.role);
    case 'CUPID_LINK':
      return true; // Cupid may pick themself
    case 'GUARD_PROTECT':
      return (!self || rules?.guardCanSelfProtect !== false) && id !== me.guardLastTargetId;
    case 'DAY_VOTE':
      return !self && (!view.candidates || view.candidates.includes(id));
    case 'WITCH_ACT':
      return !self && !me.witch?.poisonUsed;
    default:
      return !self;
  }
}

/** How many players an action needs (Cupid links two). */
export const targetsNeeded = (action: GameCommandType | null | undefined) =>
  action === 'CUPID_LINK' ? 2 : 1;

/**
 * Next selection after tapping `id`: tapping a selected player unselects them; when the action
 * needs N players, the oldest pick is dropped once N are selected.
 */
export function nextSelection(
  action: GameCommandType | null | undefined,
  current: readonly string[],
  id: string,
): string[] {
  if (current.includes(id)) return current.filter((x) => x !== id);
  return [...current, id].slice(-targetsNeeded(action));
}

/** A key that changes with every phase step: a selection belongs to one step. */
export const phaseStepKey = (view: PlayerView) =>
  `${view.round}-${view.phase.name}-${view.phase.step}-${view.phase.revote}`;

/** i18n key for the phase title. */
export const phaseTitleKey = (view: PlayerView) =>
  view.phase.name === 'NIGHT' ? `phase.NIGHT_${view.phase.step}` : `phase.${view.phase.name}`;

export function countVotes(votes: Record<string, string | null> | null): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const target of Object.values(votes ?? {})) {
    if (target) counts[target] = (counts[target] ?? 0) + 1;
  }
  return counts;
}

/** One line for the event log, or null for events not worth showing. */
export function describeEvent(
  e: DeliveredGameEvent,
  t: TFunction,
  name: (id: string | null) => string,
): string | null {
  switch (e.type) {
    case 'ROLE_ASSIGNED':
      return t('log.roleAssigned', { role: t(`roles.${e.payload.role}`) });
    case 'PLAYER_DIED':
      return e.payload.role
        ? t('log.diedWithRole', {
            name: name(e.payload.playerId),
            role: t(`roles.${e.payload.role}`),
          })
        : t('log.died', { name: name(e.payload.playerId) });
    case 'NO_DEATHS':
      return t('log.noDeaths');
    case 'SEER_RESULT':
      return t(e.payload.isWolf ? 'log.seerWolf' : 'log.seerNotWolf', {
        name: name(e.payload.targetId),
      });
    case 'WITCH_INFO':
      return e.payload.victimId
        ? t('action.witchVictim', { name: name(e.payload.victimId) })
        : t('action.witchNoVictim');
    case 'VOTE_RESULT':
      if (e.payload.executedId) return t('log.voteExecuted', { name: name(e.payload.executedId) });
      if (e.payload.revote) return t('log.voteRevote');
      return t('log.voteNobody');
    case 'HUNTER_SHOT':
      return e.payload.targetId
        ? t('log.hunterShot', { hunter: name(e.payload.hunterId), name: name(e.payload.targetId) })
        : t('log.hunterMissed', { hunter: name(e.payload.hunterId) });
    case 'CUPID_LINKED':
      return t('log.cupidLinked', {
        a: name(e.payload.loverIds[0]),
        b: name(e.payload.loverIds[1]),
      });
    case 'LOVER_ASSIGNED':
      return t('log.loverAssigned', {
        name: name(e.payload.partnerId),
        role: t(`roles.${e.payload.partnerRole}`),
      });
    case 'INFECTED':
      return t('log.infected');
    case 'WOLF_JOINED':
      return t('log.wolfJoined', { name: name(e.payload.playerId) });
    case 'FOOL_REVEALED':
      return t('log.foolRevealed', { name: name(e.payload.playerId) });
    case 'ELDER_SURVIVED':
      return t('log.elderSurvived');
    case 'GAME_OVER':
      return t(`log.winner.${e.payload.winner}`);
    default:
      return null;
  }
}

/** Seconds left until `endsAt` (rounded up). */
export const secondsLeft = (endsAt: number, now = Date.now()) =>
  Math.max(0, Math.ceil((endsAt - now) / 1000));

/** The language this user reads captions in (same rule as the server): preference, else UI. */
export function captionLangOf(user: Pick<UserView, 'locale' | 'captionLangs'>): CaptionLang {
  const first = user.captionLangs[0];
  return first && (CAPTION_LANGS as readonly string[]).includes(first)
    ? (first as CaptionLang)
    : user.locale;
}
