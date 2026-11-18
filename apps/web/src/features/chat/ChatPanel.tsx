import type { Channel } from '@werewolf/shared';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, cn, Input } from '../../components/ui';
import { attempt } from '../../lib/errors';
import { call } from '../../lib/socket';
import { useGame } from '../../stores/game';

/**
 * Text chat. In the lobby there is one channel. In a game the tabs are the channels this player
 * reads, and the input is enabled only when `view.channels[channel].publish` (turn-based speech).
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
  // Jump to the channel that just opened for me (e.g. wolves at night).
  const openChannel = tabs.find((c) => c !== 'lobby' && view?.channels[c as 'main']?.publish);
  useEffect(() => {
    if (openChannel) setActive(openChannel);
  }, [openChannel]);
  useEffect(() => {
    if (!tabs.includes(active)) setActive(tabs[0] ?? 'lobby');
  }, [tabs, active]);

  const canPost = lobby || active === 'lobby' || view?.channels[active as 'main']?.publish === true;
  const messages = chat.filter((m) => m.channel === active);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    if (await attempt(t, () => call('chat:send', { channel: active, text: value }))) setText('');
  };

  return (
    <Card className="flex h-[420px] flex-col gap-2" data-testid="chat-panel">
      <div className="flex gap-1">
        {tabs.map((c) => (
          <button
            type="button"
            key={c}
            onClick={() => setActive(c)}
            className={cn(
              'rounded-md px-2 py-1 text-xs',
              c === active ? 'bg-white/15 text-white' : 'text-gray-400 hover:bg-white/5',
            )}
          >
            {t(`chat.channel.${c}`)}
          </button>
        ))}
      </div>
      <ul className="flex-1 space-y-1 overflow-y-auto text-sm" data-testid="chat-messages">
        {messages.map((m) => (
          <li key={m.id}>
            <span className="font-medium text-moon">{m.senderName}: </span>
            <span className="text-gray-200">{m.text}</span>
          </li>
        ))}
      </ul>
      <form onSubmit={send} className="flex gap-2">
        <Input
          data-testid="chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={300}
          disabled={!canPost}
          placeholder={canPost ? t('chat.placeholder') : t('chat.notYourTurn')}
        />
        <Button type="submit" disabled={!canPost || !text.trim()}>
          {t('chat.send')}
        </Button>
      </form>
    </Card>
  );
}
