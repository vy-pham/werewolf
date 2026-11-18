import { describeEvent } from '@werewolf/client-core';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/ui';
import { useGame } from '../../stores/game';
import { useNames } from './names';

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
