import { attempt } from '@werewolf/client-core';
import type { Channel } from '@werewolf/shared';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { colors } from '@/components/theme';
import { Badge, Button, Card, Muted, styles } from '@/components/ui';
import { startVoice, stopVoice, toggleMic, useVoice } from '@/lib/client';

type Status = 'talk' | 'listen' | 'off';

/** Join/leave voice, mute, and what this player may do on each channel right now. */
export function VoiceBar() {
  const { t } = useTranslation();
  const { active, enabled, micOn, grants, remoteAudio, error } = useVoice();

  if (!enabled) {
    return (
      <Card testID="voice-bar">
        <Muted>{t('voice.disabled')}</Muted>
      </Card>
    );
  }

  const statusOf = (c: Channel): Status => {
    const g = grants[c];
    if (g?.publish) return 'talk';
    return g?.subscribe ? 'listen' : 'off';
  };

  return (
    <Card testID={`voice-bar-${active ? 'on' : 'off'}-${remoteAudio}`}>
      {active ? (
        <>
          <View style={styles.row}>
            <Button
              testID={`voice-mic-${micOn ? 'on' : 'off'}`}
              variant={micOn ? 'secondary' : 'danger'}
              title={micOn ? `🎙️ ${t('voice.mute')}` : `🔇 ${t('voice.unmute')}`}
              onPress={() => attempt(t, toggleMic)}
            />
            <Button
              variant="ghost"
              title={t('voice.leave')}
              onPress={() => attempt(t, stopVoice)}
            />
          </View>
          <View style={styles.row}>
            {(Object.keys(grants) as Channel[]).map((c) => {
              const status = statusOf(c);
              return (
                <View key={c} testID={`voice-channel-${c}-${status}`}>
                  <Badge
                    tone={status === 'talk' ? 'good' : status === 'listen' ? 'neutral' : 'bad'}
                    label={`${t(`chat.channel.${c}`)}: ${t(`voice.status.${status}`)}`}
                  />
                </View>
              );
            })}
          </View>
        </>
      ) : (
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Text style={{ color: colors.text, flex: 1 }}>{t('voice.prompt')}</Text>
          <Button
            testID="voice-join"
            title={`🎧 ${t('voice.join')}`}
            onPress={() => attempt(t, startVoice)}
          />
        </View>
      )}
      {error ? <Text style={{ color: colors.badText, fontSize: 12 }}>{error}</Text> : null}
    </Card>
  );
}
