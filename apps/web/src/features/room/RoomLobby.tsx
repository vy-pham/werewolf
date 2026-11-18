import { useNavigate } from '@tanstack/react-router';
import { MIN_PLAYERS, type RoomView } from '@werewolf/shared';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Card } from '../../components/ui';
import { attempt } from '../../lib/errors';
import { call } from '../../lib/socket';
import { stopVoice } from '../../lib/voice';
import { useGame } from '../../stores/game';
import { useSession } from '../../stores/session';
import { useToast } from '../../stores/toast';
import { ChatPanel } from '../chat/ChatPanel';
import { VoiceBar } from '../voice/VoiceBar';
import { SettingsPanel } from './SettingsPanel';

export function RoomLobby({ room }: { room: RoomView }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const me = useSession((s) => s.user);
  const isHost = room.hostId === me?.id;
  const myMember = room.members.find((m) => m.userId === me?.id);
  const others = room.members.filter((m) => m.userId !== room.hostId);
  const everyoneReady = others.every((m) => m.ready);
  const canStart = room.members.length >= MIN_PLAYERS && everyoneReady;

  const inviteLink = `${window.location.origin}/r/${room.code}`;
  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      useToast.getState().push(t('room.linkCopied'));
    } catch {
      useToast.getState().push(inviteLink);
    }
  };

  const leave = async () => {
    const ok = await attempt(t, () => call('room:leave', {}));
    if (ok) {
      await stopVoice();
      useGame.getState().leaveRoom();
      await navigate({ to: '/' });
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4 px-4 py-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <Card className="flex flex-wrap items-center gap-3">
          <div>
            <div className="text-gray-400 text-xs">{t('room.code')}</div>
            <div
              className="font-bold font-mono text-2xl text-moon tracking-widest"
              data-testid="room-code"
            >
              {room.code}
            </div>
          </div>
          <span className="flex-1" />
          <Button variant="secondary" onClick={copyInvite}>
            {t('room.copyLink')}
          </Button>
          <Button variant="ghost" onClick={leave}>
            {t('room.leave')}
          </Button>
        </Card>

        <VoiceBar />

        <Card>
          <h2 className="mb-3 font-semibold">
            {t('room.players', { count: room.members.length, max: room.maxPlayers })}
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2" data-testid="member-list">
            {room.members.map((m) => (
              <li
                key={m.userId}
                className="flex items-center gap-2 rounded-lg bg-black/20 px-3 py-2"
                data-testid="member"
              >
                <span className="w-6 text-gray-500 text-xs">#{m.seat}</span>
                <span className={m.online ? '' : 'text-gray-500'}>{m.displayName}</span>
                {m.userId === room.hostId ? <Badge tone="moon">{t('room.host')}</Badge> : null}
                <span className="flex-1" />
                {m.userId === room.hostId ? null : m.ready ? (
                  <Badge tone="good">{t('room.ready')}</Badge>
                ) : (
                  <Badge>{t('room.notReady')}</Badge>
                )}
                {isHost && m.userId !== me?.id ? (
                  <Button
                    variant="ghost"
                    className="px-2 py-0.5 text-xs"
                    onClick={() => attempt(t, () => call('room:kick', { userId: m.userId }))}
                  >
                    {t('room.kick')}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>

        <div className="flex flex-wrap gap-3">
          {isHost ? (
            <Button
              data-testid="start-game"
              disabled={!canStart}
              onClick={() => attempt(t, () => call('game:start', {}))}
            >
              {t('room.start')}
            </Button>
          ) : (
            <Button
              data-testid="toggle-ready"
              variant={myMember?.ready ? 'secondary' : 'primary'}
              onClick={() => attempt(t, () => call('room:ready', { ready: !myMember?.ready }))}
            >
              {myMember?.ready ? t('room.unready') : t('room.markReady')}
            </Button>
          )}
          {isHost && !canStart ? (
            <span className="self-center text-gray-400 text-sm">
              {room.members.length < MIN_PLAYERS
                ? t('room.needPlayers', { count: MIN_PLAYERS })
                : t('room.waitingReady')}
            </span>
          ) : null}
        </div>

        <SettingsPanel room={room} editable={isHost} />
      </div>

      <ChatPanel lobby />
    </div>
  );
}
