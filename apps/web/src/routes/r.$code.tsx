import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card } from '../components/ui';
import { LoginCard } from '../features/auth/LoginCard';
import { GameOver } from '../features/game/GameOver';
import { GameScreen } from '../features/game/GameScreen';
import { RoomLobby } from '../features/room/RoomLobby';
import { errorMessage } from '../lib/errors';
import { joinRoom } from '../lib/socket';
import { useGame } from '../stores/game';
import { useSession } from '../stores/session';

export const Route = createFileRoute('/r/$code')({
  component: RoomPage,
});

function RoomPage() {
  const { code } = Route.useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useSession((s) => s.user);
  const room = useGame((s) => s.room);
  const view = useGame((s) => s.view);
  const gameId = useGame((s) => s.gameId);
  const lastResult = useGame((s) => s.lastResult);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setError(null);
    joinRoom(code).catch((e) => setError(errorMessage(t, e)));
  }, [user, code, t]);

  if (!user) {
    return (
      <section className="flex flex-1 items-center justify-center px-4">
        <LoginCard />
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex flex-1 items-center justify-center px-4">
        <Card className="space-y-3 text-center">
          <p>{error}</p>
          <Button onClick={() => navigate({ to: '/' })}>{t('room.backHome')}</Button>
        </Card>
      </section>
    );
  }

  if (!room || room.code !== code.toUpperCase()) {
    return <p className="p-6 text-center text-gray-400">{t('common.loading')}</p>;
  }

  if (room.status === 'in_game' && gameId && view) {
    return <GameScreen gameId={gameId} view={view} rules={room.settings.rules} />;
  }
  if (lastResult) return <GameOver result={lastResult} />;
  return <RoomLobby room={room} />;
}
