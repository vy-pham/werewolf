import type { PlayerView } from '@werewolf/shared';
import { useTranslation } from 'react-i18next';
import { Badge, Card } from '../../components/ui';
import { useCountdown } from '../../lib/hooks';
import { useNames } from './names';

export function PhaseHeader({ view }: { view: PlayerView }) {
  const { t } = useTranslation();
  const name = useNames();
  const secondsLeft = useCountdown(view.phase.endsAt);
  const phaseKey =
    view.phase.name === 'NIGHT' ? `phase.NIGHT_${view.phase.step}` : `phase.${view.phase.name}`;

  let detail: string | null = null;
  if (view.phase.name === 'DISCUSSION' && view.speakerId) {
    detail = t('game.speaking', {
      name: name(view.speakerId),
      turn: view.phase.step,
      total: view.speakerOrder?.length ?? 0,
    });
  } else if (view.phase.name === 'VOTE' && view.phase.revote > 0) {
    detail = t('game.revote', { count: view.phase.revote });
  } else if ((view.phase.name === 'DEFENSE' || view.phase.name === 'EXECUTION') && view.accusedId) {
    detail = t('game.accused', { name: name(view.accusedId) });
  } else if (view.phase.name === 'HUNTER_SHOT' && view.hunterId) {
    detail = t('game.hunterShooting', { name: name(view.hunterId) });
  }

  return (
    <Card className="flex flex-wrap items-center gap-3" data-testid="phase-header">
      <div>
        <div className="text-gray-400 text-xs">{t('game.round', { count: view.round })}</div>
        <div
          className="font-semibold text-lg"
          data-testid="phase-name"
          data-phase={view.phase.name}
        >
          {t(phaseKey)}
        </div>
        {detail ? <div className="text-gray-300 text-sm">{detail}</div> : null}
      </div>
      <span className="flex-1" />
      {view.phase.name !== 'GAME_OVER' ? (
        <div className="font-mono text-3xl text-moon tabular-nums" data-testid="countdown">
          {secondsLeft}s
        </div>
      ) : null}
      {view.me ? (
        <div className="text-right" data-testid="my-role" data-role={view.me.role}>
          <div className="text-gray-400 text-xs">{t('game.yourRole')}</div>
          <Badge tone={view.me.team === 'wolves' ? 'bad' : 'good'} className="text-sm">
            {t(`roles.${view.me.role}`)}
          </Badge>
          {!view.me.alive ? (
            <div className="mt-1 text-gray-400 text-xs">{t('game.youAreDead')}</div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
