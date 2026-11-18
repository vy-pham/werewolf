import { useQuery, useQueryClient } from '@tanstack/react-query';
import { attempt, useToast } from '@werewolf/client-core';
import {
  REPORT_REASONS,
  type ReportableGame,
  type ReportReason,
  type ReportView,
} from '@werewolf/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card } from '../../components/ui';
import { api } from '../../lib/api';

/**
 * Report players of recent games (FR-MISC-02: until 24 h after the game ended). The server copies
 * the reported player's chat and transcripts as evidence. `latestOnly`: the game that just ended.
 */
export function ReportPanel({ latestOnly = false }: { latestOnly?: boolean }) {
  const { t, i18n } = useTranslation();
  const games = useQuery({
    queryKey: ['reportable'],
    queryFn: () => api<ReportableGame[]>('/reports/reportable'),
  });
  const list = latestOnly ? (games.data ?? []).slice(0, 1) : (games.data ?? []);
  if (latestOnly && list.length === 0) return null;

  const time = (ms: number) =>
    new Date(ms).toLocaleString(i18n.language, { dateStyle: 'short', timeStyle: 'short' });

  return (
    <Card className="space-y-3" data-testid="report-panel">
      <h2 className="font-semibold">{latestOnly ? t('reports.title') : t('reports.recent')}</h2>
      {list.length === 0 ? <p className="text-gray-400 text-sm">{t('reports.none')}</p> : null}
      {list.map((game) => (
        <div key={game.gameId} className="space-y-1">
          <p className="text-gray-500 text-xs">
            {t('reports.until', { time: time(game.reportableUntil) })}
          </p>
          <ul className="space-y-1">
            {game.players.map((p) => (
              <ReportRow
                key={p.userId}
                gameId={game.gameId}
                player={p}
                reported={game.reportedIds.includes(p.userId)}
              />
            ))}
          </ul>
        </div>
      ))}
    </Card>
  );
}

function ReportRow({
  gameId,
  player,
  reported,
}: {
  gameId: string;
  player: ReportableGame['players'][number];
  reported: boolean;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('abuse');
  const [note, setNote] = useState('');

  const submit = async () => {
    const ok = await attempt(t, () =>
      api<ReportView>('/reports', {
        method: 'POST',
        body: { gameId, reportedId: player.userId, reason, note: note.trim() || undefined },
      }),
    );
    if (!ok) return;
    useToast.getState().push(t('reports.sent'));
    setOpen(false);
    await queryClient.invalidateQueries({ queryKey: ['reportable'] });
  };

  return (
    <li className="rounded-lg bg-black/20 px-3 py-2 text-sm" data-testid="report-row">
      <div className="flex items-center gap-2">
        <span className="flex-1">{player.displayName}</span>
        {reported ? (
          <span className="text-gray-400 text-xs">{t('reports.reported')}</span>
        ) : (
          <Button
            variant="ghost"
            className="px-2 py-0.5 text-xs"
            data-testid="report-open"
            onClick={() => setOpen(!open)}
          >
            {t('reports.report')}
          </Button>
        )}
      </div>
      {open && !reported ? (
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-2 text-gray-300 text-xs">
            {t('reports.reason')}
            <select
              value={reason}
              data-testid="report-reason"
              onChange={(e) => setReason(e.target.value as ReportReason)}
              className="flex-1 rounded-md border border-white/20 bg-transparent px-2 py-1"
            >
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r} className="text-black">
                  {t(`reports.reasons.${r}`)}
                </option>
              ))}
            </select>
          </label>
          <textarea
            value={note}
            maxLength={500}
            rows={2}
            placeholder={t('reports.note')}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-md border border-white/20 bg-black/30 px-2 py-1 text-sm"
          />
          <div className="flex gap-2">
            <Button className="px-3 py-1 text-xs" data-testid="report-send" onClick={submit}>
              {t('reports.send')}
            </Button>
            <Button variant="ghost" className="px-3 py-1 text-xs" onClick={() => setOpen(false)}>
              {t('reports.cancel')}
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
