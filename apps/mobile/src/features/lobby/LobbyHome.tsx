import { attempt } from '@werewolf/client-core';
import type { RoomSummary, RoomView } from '@werewolf/shared';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { colors } from '@/components/theme';
import { Button, Card, Muted, styles, TextField, Title, Toggle } from '@/components/ui';
import { api } from '@/lib/client';

export function LobbyHome() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setRooms(await api<RoomSummary[]>(`/rooms?lang=${i18n.language}`, { auth: false }));
    } catch {
      // offline: keep the last list
    }
    setRefreshing(false);
  }, [i18n.language]);

  useEffect(() => {
    void load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, [load]);

  const goTo = (roomCode: string) => router.push(`/r/${roomCode.toUpperCase()}`);

  const create = () =>
    attempt(t, async () => {
      const room = await api<RoomView>('/rooms', {
        method: 'POST',
        body: { visibility: isPublic ? 'public' : 'private', lang: i18n.language },
      });
      goTo(room.code);
    });

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      keyboardShouldPersistTaps="handled"
    >
      <Card>
        <Title>{t('lobby.joinTitle')}</Title>
        <View style={styles.row}>
          <TextField
            testID="room-code-input"
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase())}
            maxLength={6}
            autoCapitalize="characters"
            placeholder="ABC123"
            style={{ flex: 1, letterSpacing: 4, fontFamily: 'monospace' }}
          />
          <Button
            testID="join-room"
            title={t('lobby.join')}
            disabled={code.trim().length !== 6}
            onPress={() => goTo(code.trim())}
          />
        </View>
      </Card>

      <Card>
        <Title>{t('lobby.createTitle')}</Title>
        <Toggle label={t('lobby.publicRoom')} value={isPublic} onChange={setIsPublic} />
        <Button testID="create-room" title={t('lobby.create')} onPress={create} />
      </Card>

      <Card>
        <Title>{t('lobby.publicRooms')}</Title>
        {rooms.length === 0 ? <Muted>{t('lobby.noPublicRooms')}</Muted> : null}
        {rooms.map((r) => (
          <View key={r.code} style={[styles.row, { justifyContent: 'space-between' }]}>
            <Text style={{ color: colors.text, flex: 1 }}>
              {r.name} · {t('lobby.players', { count: r.players, max: r.maxPlayers })}
            </Text>
            <Button variant="secondary" title={t('lobby.join')} onPress={() => goTo(r.code)} />
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}
