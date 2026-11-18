import { isWolfRole, type PlayerView } from '@werewolf/shared';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Card } from '../../components/ui';
import { useGame } from '../../stores/game';
import { ReportPanel } from '../reports/ReportPanel';
import { useNames } from './names';

export function GameOver({ result }: { result: PlayerView }) {
  const { t } = useTranslation();
  const name = useNames();
  const dismiss = useGame((s) => s.dismissResult);
  const won = result.me && result.winner === result.me.team;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6" data-testid="game-over">
      <Card className="space-y-2 text-center">
        <div className="text-5xl">
          {result.winner === 'wolves' ? '🐺' : result.winner === 'lovers' ? '💘' : '🏡'}
        </div>
        <h2 className="font-bold text-2xl" data-testid="winner" data-winner={result.winner ?? ''}>
          {result.winner ? t(`log.winner.${result.winner}`) : null}
        </h2>
        {result.me ? (
          <p className={won ? 'text-green-300' : 'text-red-300'}>
            {won ? t('gameOver.youWon') : t('gameOver.youLost')}
          </p>
        ) : null}
      </Card>
      <Card>
        <ul className="grid gap-2 sm:grid-cols-2">
          {[...result.players]
            .sort((a, b) => a.seat - b.seat)
            .map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-sm">
                <span className={p.alive ? '' : 'text-gray-500 line-through'}>{name(p.id)}</span>
                {result.lovers?.includes(p.id) ? <span title={t('game.lover')}>💘</span> : null}
                <span className="flex-1" />
                {p.role ? (
                  <Badge tone={isWolfRole(p.role) ? 'bad' : 'good'}>{t(`roles.${p.role}`)}</Badge>
                ) : null}
              </li>
            ))}
        </ul>
      </Card>
      <ReportPanel latestOnly />
      <div className="text-center">
        <Button onClick={dismiss} data-testid="back-to-room">
          {t('gameOver.backToRoom')}
        </Button>
      </div>
    </div>
  );
}
