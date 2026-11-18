import type { DeliveredGameEvent } from '@werewolf/shared';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/ui';
import { useGame } from '../../stores/game';
import { useNames } from './names';

/** Turns a delivered event into one log line, or null for events not worth showing. */
function describeEvent(e: DeliveredGameEvent, t: TFunction, name: (id: string | null) => string) {
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
    case 'GAME_OVER':
      return t(`log.winner.${e.payload.winner}`);
    default:
      return null;
  }
}

export function EventLog() {
  const { t } = useTranslation();
  const name = useNames();
  const events = useGame((s) => s.events);
  const lines = events
    .map((e) => ({ seq: e.seq, text: describeEvent(e, t, name) }))
    .filter((l): l is { seq: number; text: string } => l.text !== null)
    .slice(-30)
    .reverse();

  return (
    <Card className="space-y-2">
      <h3 className="font-semibold text-sm">{t('log.title')}</h3>
      <ul
        className="max-h-64 space-y-1 overflow-y-auto text-gray-300 text-sm"
        data-testid="event-log"
      >
        {lines.map((l) => (
          <li key={l.seq}>{l.text}</li>
        ))}
      </ul>
    </Card>
  );
}
