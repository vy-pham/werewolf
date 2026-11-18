import { attempt, useToast } from '@werewolf/client-core';
import {
  REPORT_REASONS,
  type ReportableGame,
  type ReportReason,
  type ReportView,
} from '@werewolf/shared';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { colors } from '@/components/theme';
import { Button, Card, Muted, styles, TextField, Title } from '@/components/ui';
import { api } from '@/lib/client';

/** Report players of recent games, within 24 h (same behaviour as the web ReportPanel). */
export function ReportPanel({ latestOnly = false }: { latestOnly?: boolean }) {
  const { t, i18n } = useTranslation();
  const [games, setGames] = useState<ReportableGame[] | null>(null);

  const load = useCallback(async () => {
    try {
      setGames(await api<ReportableGame[]>('/reports/reportable'));
    } catch {
      setGames([]);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const list = latestOnly ? (games ?? []).slice(0, 1) : (games ?? []);
  if (games === null || (latestOnly && list.length === 0)) return null;
  const time = (ms: number) =>
    new Date(ms).toLocaleString(i18n.language, { dateStyle: 'short', timeStyle: 'short' });

  return (
    <Card testID="report-panel">
      <Title>{latestOnly ? t('reports.title') : t('reports.recent')}</Title>
      {list.length === 0 ? <Muted>{t('reports.none')}</Muted> : null}
      {list.map((game) => (
        <View key={game.gameId} style={{ gap: 6 }}>
          <Text style={{ color: colors.faint, fontSize: 12 }}>
            {t('reports.until', { time: time(game.reportableUntil) })}
          </Text>
          {game.players.map((p) => (
            <ReportRow
              key={p.userId}
              gameId={game.gameId}
              player={p}
              reported={game.reportedIds.includes(p.userId)}
              onSent={load}
            />
          ))}
        </View>
      ))}
    </Card>
  );
}

function ReportRow({
  gameId,
  player,
  reported,
  onSent,
}: {
  gameId: string;
  player: ReportableGame['players'][number];
  reported: boolean;
  onSent: () => Promise<void>;
}) {
  const { t } = useTranslation();
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
    await onSent();
  };

  return (
    <View style={{ gap: 6 }}>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <Text style={{ color: colors.text, flex: 1 }}>{player.displayName}</Text>
        {reported ? (
          <Muted>{t('reports.reported')}</Muted>
        ) : (
          <Button
            testID="report-open"
            variant="ghost"
            title={t('reports.report')}
            onPress={() => setOpen(!open)}
          />
        )}
      </View>
      {open && !reported ? (
        <View style={{ gap: 6 }}>
          <Muted>{t('reports.reason')}</Muted>
          <View style={[styles.row, { flexWrap: 'wrap' }]}>
            {REPORT_REASONS.map((r) => (
              <Button
                key={r}
                testID={`report-reason-${r}`}
                variant={reason === r ? 'secondary' : 'ghost'}
                title={t(`reports.reasons.${r}`)}
                onPress={() => setReason(r)}
              />
            ))}
          </View>
          <TextField
            value={note}
            onChangeText={setNote}
            maxLength={500}
            multiline
            placeholder={t('reports.note')}
          />
          <View style={styles.row}>
            <Button testID="report-send" title={t('reports.send')} onPress={submit} />
            <Button variant="ghost" title={t('reports.cancel')} onPress={() => setOpen(false)} />
          </View>
        </View>
      ) : null}
    </View>
  );
}
