import { ROLE_IDS, type UserStats } from '@werewolf/shared';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { colors } from '@/components/theme';
import { Badge, Card, Muted, styles, Title } from '@/components/ui';
import { api, useSession } from '@/lib/client';

/** Personal statistics (same as the web StatsCard). */
export function StatsCard() {
  const { t } = useTranslation();
  const userId = useSession((s) => s.user?.id);
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    if (!userId) return;
    api<UserStats>(`/users/${userId}/stats`)
      .then(setStats)
      .catch(() => setStats(null));
  }, [userId]);

  if (!stats) return null;
  const rate = stats.games ? Math.round((stats.wins / stats.games) * 100) : 0;

  return (
    <Card testID="stats-card">
      <Title>{t('stats.title')}</Title>
      {stats.games === 0 ? (
        <Muted>{t('stats.empty')}</Muted>
      ) : (
        <>
          <Text style={{ color: colors.text }}>
            {t('stats.summary', { games: stats.games, wins: stats.wins, rate })}
          </Text>
          <View style={[styles.row, { flexWrap: 'wrap' }]}>
            {ROLE_IDS.filter((r) => stats.byRole[r]?.games).map((r) => (
              <Badge
                key={r}
                label={t('stats.role', {
                  role: t(`roles.${r}`),
                  wins: stats.byRole[r]?.wins ?? 0,
                  games: stats.byRole[r]?.games ?? 0,
                })}
              />
            ))}
          </View>
        </>
      )}
    </Card>
  );
}
