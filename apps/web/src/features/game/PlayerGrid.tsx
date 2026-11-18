import { countVotes } from '@werewolf/client-core';
import { isWolfRole, type PlayerView } from '@werewolf/shared';
import { useTranslation } from 'react-i18next';
import { Badge, cn } from '../../components/ui';
import { useVoice } from '../../lib/voice';
import { useNames } from './names';

interface Props {
  view: PlayerView;
  selectable: (id: string) => boolean;
  selectedIds: string[];
  onSelect: (id: string) => void;
}

export function PlayerGrid({ view, selectable, selectedIds, onSelect }: Props) {
  const { t } = useTranslation();
  const name = useNames();
  const dayVotes = countVotes(view.dayVotes);
  const wolfVotes = countVotes(view.wolfVotes);
  const speaking = useVoice((s) => s.speaking);

  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4" data-testid="player-grid">
      {[...view.players]
        .sort((a, b) => a.seat - b.seat)
        .map((p) => {
          const canSelect = selectable(p.id);
          const isMe = p.id === view.me?.id;
          return (
            <li key={p.id}>
              <button
                type="button"
                data-testid="player-card"
                data-player-id={p.id}
                data-speaking={speaking.includes(p.id)}
                data-alive={p.alive}
                data-role={p.role ?? ''}
                data-selectable={canSelect}
                disabled={!canSelect}
                onClick={() => onSelect(p.id)}
                className={cn(
                  'flex w-full flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left transition',
                  p.alive
                    ? 'border-white/10 bg-white/5'
                    : 'border-transparent bg-black/30 opacity-60',
                  canSelect && 'cursor-pointer hover:border-moon',
                  selectedIds.includes(p.id) && 'border-moon ring-2 ring-moon/50',
                  view.speakerId === p.id && 'border-green-400',
                  speaking.includes(p.id) && 'shadow-[0_0_0_2px_rgba(74,222,128,0.8)]',
                )}
              >
                <span className="flex w-full items-center gap-1 text-sm">
                  <span className="text-gray-500 text-xs">#{p.seat}</span>
                  <span className={cn('truncate', !p.alive && 'line-through')}>{name(p.id)}</span>
                  {isMe ? <span className="text-gray-400 text-xs">({t('game.you')})</span> : null}
                  {view.speakerId === p.id ? (
                    <span role="img" aria-label={t('game.speakingNow')}>
                      🎙️
                    </span>
                  ) : null}
                </span>
                <span className="flex flex-wrap gap-1">
                  {p.role ? (
                    <Badge tone={isWolfRole(p.role) ? 'bad' : 'neutral'}>
                      {t(`roles.${p.role}`)}
                    </Badge>
                  ) : null}
                  {view.me?.partnerId === p.id || view.me?.cupidLinked?.includes(p.id) ? (
                    <Badge tone="moon">💘 {t('game.lover')}</Badge>
                  ) : null}
                  {!p.alive ? <Badge>{t('game.dead')}</Badge> : null}
                  {view.accusedId === p.id ? <Badge tone="bad">{t('game.onTrial')}</Badge> : null}
                  {dayVotes[p.id] ? (
                    <Badge tone="moon">{t('game.votes', { count: dayVotes[p.id] })}</Badge>
                  ) : null}
                  {wolfVotes[p.id] ? <Badge tone="bad">🐺 × {wolfVotes[p.id]}</Badge> : null}
                </span>
              </button>
            </li>
          );
        })}
    </ul>
  );
}
