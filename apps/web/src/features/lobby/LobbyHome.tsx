import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { RoomSummary, RoomView } from '@werewolf/shared';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Input, Toggle } from '../../components/ui';
import { api } from '../../lib/api';
import { attempt } from '../../lib/errors';

export function LobbyHome() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [busy, setBusy] = useState(false);

  const publicRooms = useQuery({
    queryKey: ['rooms', i18n.language],
    queryFn: () => api<RoomSummary[]>(`/rooms?lang=${i18n.language}`, { auth: false }),
    refetchInterval: 10_000,
  });

  const goTo = (roomCode: string) =>
    navigate({ to: '/r/$code', params: { code: roomCode.toUpperCase() } });

  const join = (e: FormEvent) => {
    e.preventDefault();
    if (code.trim().length === 6) void goTo(code.trim());
  };

  const create = async () => {
    setBusy(true);
    await attempt(t, async () => {
      const room = await api<RoomView>('/rooms', {
        method: 'POST',
        body: { visibility: isPublic ? 'public' : 'private', lang: i18n.language },
      });
      await goTo(room.code);
    });
    setBusy(false);
  };

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-4 px-4 py-6 md:grid-cols-2">
      <Card className="space-y-3">
        <h2 className="font-semibold text-lg">{t('lobby.joinTitle')}</h2>
        <form onSubmit={join} className="flex gap-2">
          <Input
            data-testid="room-code-input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="ABC123"
            className="font-mono uppercase tracking-widest"
          />
          <Button type="submit" disabled={code.trim().length !== 6} data-testid="join-room">
            {t('lobby.join')}
          </Button>
        </form>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold text-lg">{t('lobby.createTitle')}</h2>
        <Toggle label={t('lobby.publicRoom')} checked={isPublic} onChange={setIsPublic} />
        <Button className="w-full" onClick={create} disabled={busy} data-testid="create-room">
          {t('lobby.create')}
        </Button>
      </Card>

      <Card className="space-y-3 md:col-span-2">
        <h2 className="font-semibold text-lg">{t('lobby.publicRooms')}</h2>
        {publicRooms.data?.length ? (
          <ul className="divide-y divide-white/10">
            {publicRooms.data.map((r) => (
              <li key={r.code} className="flex items-center justify-between py-2">
                <span>
                  {r.name}{' '}
                  <span className="text-gray-400 text-sm">
                    · {t('lobby.players', { count: r.players, max: r.maxPlayers })}
                  </span>
                </span>
                <Button variant="secondary" onClick={() => goTo(r.code)}>
                  {t('lobby.join')}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400 text-sm">{t('lobby.noPublicRooms')}</p>
        )}
      </Card>
    </div>
  );
}
