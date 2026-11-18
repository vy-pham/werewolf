import { attempt, useGame } from '@werewolf/client-core';
import type { Channel } from '@werewolf/shared';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { colors } from '@/components/theme';
import { Button, Card, styles, TextField } from '@/components/ui';
import { call } from '@/lib/client';

/**
 * Text chat. In a game the tabs are the channels this player reads; the input is enabled only
 * when `view.channels[channel].publish` (turn-based speech). The server enforces it.
 */
export function ChatPanel({ lobby = false }: { lobby?: boolean }) {
  const { t } = useTranslation();
  const view = useGame((s) => s.view);
  const chat = useGame((s) => s.chat);
  const [text, setText] = useState('');

  const tabs: Channel[] = useMemo(() => {
    if (lobby || !view?.me) return ['lobby'];
    const list: Channel[] = ['main'];
    if (view.me.role === 'werewolf') list.push('wolves');
    if (!view.me.alive) list.push('dead');
    return list;
  }, [lobby, view?.me]);

  const [active, setActive] = useState<Channel>(tabs[0] ?? 'lobby');
  const openChannel = tabs.find((c) => c !== 'lobby' && view?.channels[c as 'main']?.publish);
  useEffect(() => {
    if (openChannel) setActive(openChannel);
  }, [openChannel]);
  useEffect(() => {
    if (!tabs.includes(active)) setActive(tabs[0] ?? 'lobby');
  }, [tabs, active]);

  const canPost = active === 'lobby' || view?.channels[active as 'main']?.publish === true;
  const messages = chat.filter((m) => m.channel === active).slice(-50);

  const send = async () => {
    const value = text.trim();
    if (!value) return;
    if (await attempt(t, () => call('chat:send', { channel: active, text: value }))) setText('');
  };

  return (
    <Card testID="chat-panel">
      <View style={styles.row}>
        {tabs.map((c) => (
          <Pressable
            key={c}
            onPress={() => setActive(c)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: c === active ? 'rgba(255,255,255,0.15)' : 'transparent',
            }}
          >
            <Text style={{ color: c === active ? '#fff' : colors.muted, fontSize: 12 }}>
              {t(`chat.channel.${c}`)}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={{ gap: 4, minHeight: 80 }}>
        {messages.map((m) => (
          <Text key={m.id} style={{ color: colors.text }}>
            <Text style={{ color: colors.moon, fontWeight: '600' }}>{m.senderName}: </Text>
            {m.text}
          </Text>
        ))}
      </View>
      <View style={styles.row}>
        <TextField
          testID="chat-input"
          value={text}
          onChangeText={setText}
          maxLength={300}
          editable={canPost}
          placeholder={canPost ? t('chat.placeholder') : t('chat.notYourTurn')}
          onSubmitEditing={send}
          style={{ flex: 1 }}
        />
        <Button title={t('chat.send')} disabled={!canPost || !text.trim()} onPress={send} />
      </View>
    </Card>
  );
}
