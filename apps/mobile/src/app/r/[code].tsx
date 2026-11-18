import { errorMessage, useGame } from '@werewolf/client-core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { colors } from '@/components/theme';
import { Button, Card } from '@/components/ui';
import { LoginCard } from '@/features/auth/LoginCard';
import { GameOver } from '@/features/game/GameOver';
import { GameScreen } from '@/features/game/GameScreen';
import { RoomLobby } from '@/features/room/RoomLobby';
import { joinRoom, useSession } from '@/lib/client';

/** One room: waiting lobby → game → results. Deep link: werewolf://r/CODE */
export default function RoomPage() {
  const { code: rawCode } = useLocalSearchParams<{ code: string }>();
  const code = String(rawCode ?? '').toUpperCase();
  const { t } = useTranslation();
  const router = useRouter();
  const user = useSession((s) => s.user);
  const room = useGame((s) => s.room);
  const view = useGame((s) => s.view);
  const gameId = useGame((s) => s.gameId);
  const lastResult = useGame((s) => s.lastResult);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !code) return;
    setError(null);
    joinRoom(code).catch((e) => setError(errorMessage(t, e)));
  }, [user, code, t]);

  if (!user) {
    return (
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 16 }}>
        <LoginCard />
      </ScrollView>
    );
  }
  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 16 }}>
        <Card>
          <Text style={{ color: colors.text }}>{error}</Text>
          <Button title={t('room.backHome')} onPress={() => router.replace('/')} />
        </Card>
      </View>
    );
  }
  if (!room || room.code !== code) {
    return <Text style={{ color: colors.muted, padding: 24 }}>{t('common.loading')}</Text>;
  }
  if (room.status === 'in_game' && gameId && view) {
    return <GameScreen gameId={gameId} view={view} rules={room.settings.rules} />;
  }
  if (lastResult) return <GameOver result={lastResult} />;
  return <RoomLobby room={room} />;
}
