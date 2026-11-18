import { attempt, useGame, useToast } from '@werewolf/client-core';
import { MIN_PLAYERS, type RoomView } from '@werewolf/shared';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, Share, Text, View } from 'react-native';
import { colors } from '@/components/theme';
import { Badge, Button, Card, Muted, styles, Title } from '@/components/ui';
import { ChatPanel } from '@/features/chat/ChatPanel';
import { VoiceBar } from '@/features/voice/VoiceBar';
import { call, stopVoice, useSession } from '@/lib/client';
import { SettingsPanel } from './SettingsPanel';

export function RoomLobby({ room }: { room: RoomView }) {
  const { t } = useTranslation();
  const router = useRouter();
  const me = useSession((s) => s.user);
  const isHost = room.hostId === me?.id;
  const myMember = room.members.find((m) => m.userId === me?.id);
  const everyoneReady = room.members.filter((m) => m.userId !== room.hostId).every((m) => m.ready);
  const canStart = room.members.length >= MIN_PLAYERS && everyoneReady;

  const share = async () => {
    const link = Linking.createURL(`/r/${room.code}`);
    try {
      await Share.share({ message: `${t('app.name')}: ${room.code}\n${link}` });
    } catch {
      await Clipboard.setStringAsync(room.code);
      useToast.getState().push(t('room.linkCopied'));
    }
  };

  const leave = async () => {
    if (await attempt(t, () => call('room:leave', {}))) {
      await stopVoice();
      useGame.getState().leaveRoom();
      router.replace('/');
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16 }}
      keyboardShouldPersistTaps="handled"
    >
      <Card>
        <Muted>{t('room.code')}</Muted>
        <Text
          testID="room-code"
          style={{ color: colors.moon, fontSize: 28, fontWeight: '700', letterSpacing: 6 }}
        >
          {room.code}
        </Text>
        <View style={styles.row}>
          <Button variant="secondary" title={t('room.copyLink')} onPress={share} />
          <Button variant="ghost" title={t('room.leave')} onPress={leave} />
        </View>
      </Card>

      <VoiceBar />

      <Card>
        <Title>{t('room.players', { count: room.members.length, max: room.maxPlayers })}</Title>
        {room.members.map((m) => (
          <View key={m.userId} testID="member" style={[styles.row, { paddingVertical: 4 }]}>
            <Text style={{ color: colors.faint, width: 28 }}>#{m.seat}</Text>
            <Text style={{ color: m.online ? colors.text : colors.faint, flex: 1 }}>
              {m.displayName}
            </Text>
            {m.userId === room.hostId ? (
              <Badge tone="moon" label={t('room.host')} />
            ) : m.ready ? (
              <Badge tone="good" label={t('room.ready')} />
            ) : (
              <Badge label={t('room.notReady')} />
            )}
            {isHost && m.userId !== me?.id ? (
              <Button
                variant="ghost"
                title={t('room.kick')}
                onPress={() => attempt(t, () => call('room:kick', { userId: m.userId }))}
              />
            ) : null}
          </View>
        ))}
      </Card>

      {isHost ? (
        <>
          <Button
            testID="start-game"
            title={t('room.start')}
            disabled={!canStart}
            onPress={() => attempt(t, () => call('game:start', {}))}
          />
          {!canStart ? (
            <Muted>
              {room.members.length < MIN_PLAYERS
                ? t('room.needPlayers', { count: MIN_PLAYERS })
                : t('room.waitingReady')}
            </Muted>
          ) : null}
        </>
      ) : (
        <Button
          testID="toggle-ready"
          variant={myMember?.ready ? 'secondary' : 'primary'}
          title={myMember?.ready ? t('room.unready') : t('room.markReady')}
          onPress={() => attempt(t, () => call('room:ready', { ready: !myMember?.ready }))}
        />
      )}

      <SettingsPanel room={room} editable={isHost} />
      <ChatPanel lobby />
    </ScrollView>
  );
}
