import { useQuery } from '@tanstack/react-query';
import { ROLE_IDS, type UserStats } from '@werewolf/shared';
import { useTranslation } from 'react-i18next';
import { Badge, Card } from '../../components/ui';
import { api } from '../../lib/api';
import { useSession } from '../../stores/session';

/** Personal statistics (FR-MISC-03): games, wins, win rate per dealt role. */
export function StatsCard() {
  const { t } = useTranslation();
  const userId = useSession((s) => s.user?.id);
  const stats = useQuery({
    queryKey: ['stats', userId],
    queryFn: () => api<UserStats>(`/users/${userId}/stats`),
    enabled: Boolean(userId),
  });
  const data = stats.data;
  if (!data) return null;
  const rate = data.games ? Math.round((data.wins / data.games) * 100) : 0;

  return (
    <Card className="space-y-2" data-testid="stats-card">
      <h2 className="font-semibold text-lg">{t('stats.title')}</h2>
      {data.games === 0 ? (
        <p className="text-gray-400 text-sm">{t('stats.empty')}</p>
      ) : (
        <>
          <p className="text-sm" data-testid="stats-summary">
            {t('stats.summary', { games: data.games, wins: data.wins, rate })}
          </p>
          <div className="flex flex-wrap gap-1">
            {ROLE_IDS.filter((r) => data.byRole[r]?.games).map((r) => (
              <Badge key={r}>
                {t('stats.role', {
                  role: t(`roles.${r}`),
                  wins: data.byRole[r]?.wins ?? 0,
                  games: data.byRole[r]?.games ?? 0,
                })}
              </Badge>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
