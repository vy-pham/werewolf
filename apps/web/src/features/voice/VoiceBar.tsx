import type { Channel } from '@werewolf/shared';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Card } from '../../components/ui';
import { attempt } from '../../lib/errors';
import { startVoice, stopVoice, toggleMic, useVoice } from '../../lib/voice';

type Status = 'talk' | 'listen' | 'off';

/** Join/leave voice, mute, and what this player may do on each channel right now. */
export function VoiceBar() {
  const { t } = useTranslation();
  const { active, enabled, micOn, grants, connected, remoteAudio, error } = useVoice();

  if (!enabled) {
    return (
      <Card className="text-gray-400 text-sm" data-testid="voice-bar">
        {t('voice.disabled')}
      </Card>
    );
  }

  const channels = Object.keys(grants) as Channel[];
  const statusOf = (c: Channel): Status => {
    const g = grants[c];
    if (g?.publish) return 'talk';
    return g?.subscribe ? 'listen' : 'off';
  };

  return (
    <Card
      className="flex flex-wrap items-center gap-2"
      data-testid="voice-bar"
      data-active={active}
      data-remote-audio={remoteAudio}
    >
      {active ? (
        <>
          <Button
            variant={micOn ? 'secondary' : 'danger'}
            data-testid="voice-mic"
            data-on={micOn}
            onClick={() => attempt(t, toggleMic)}
          >
            {micOn ? `🎙️ ${t('voice.mute')}` : `🔇 ${t('voice.unmute')}`}
          </Button>
          {channels.map((c) => {
            const status = statusOf(c);
            return (
              <Badge
                key={c}
                tone={status === 'talk' ? 'good' : status === 'listen' ? 'neutral' : 'bad'}
              >
                <span data-testid="voice-channel" data-channel={c} data-status={status}>
                  {t(`chat.channel.${c}`)}: {t(`voice.status.${status}`)}
                  {connected.includes(c) ? '' : ' …'}
                </span>
              </Badge>
            );
          })}
          <span className="flex-1" />
          <Button variant="ghost" onClick={() => attempt(t, stopVoice)}>
            {t('voice.leave')}
          </Button>
        </>
      ) : (
        <>
          <span className="text-gray-300 text-sm">{t('voice.prompt')}</span>
          <span className="flex-1" />
          <Button data-testid="voice-join" onClick={() => attempt(t, startVoice)}>
            🎧 {t('voice.join')}
          </Button>
        </>
      )}
      {error ? <span className="w-full text-red-300 text-xs">{error}</span> : null}
    </Card>
  );
}
