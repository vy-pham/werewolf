import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import type { AuthResponse, Locale } from '@werewolf/shared';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Input } from '../../components/ui';
import { api } from '../../lib/api';
import { GOOGLE_CLIENT_ID } from '../../lib/config';
import { attempt } from '../../lib/errors';
import { useSession } from '../../stores/session';

export function LoginCard() {
  const { t, i18n } = useTranslation();
  const setAuth = useSession((s) => s.setAuth);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const locale = i18n.language as Locale;

  const playAsGuest = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await attempt(t, async () =>
      setAuth(
        await api<AuthResponse>('/auth/guest', {
          method: 'POST',
          body: { displayName: name.trim(), locale },
          auth: false,
        }),
      ),
    );
    setBusy(false);
  };

  const signInWithGoogle = (idToken: string) =>
    attempt(t, async () =>
      setAuth(
        await api<AuthResponse>('/auth/google', {
          method: 'POST',
          body: { idToken, locale },
          auth: false,
        }),
      ),
    );

  return (
    <Card className="w-full max-w-sm space-y-4">
      <form onSubmit={playAsGuest} className="space-y-3">
        <div className="space-y-1 text-sm">
          <label htmlFor="nickname" className="text-gray-300">
            {t('auth.nickname')}
          </label>
          <Input
            id="nickname"
            data-testid="nickname"
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={3}
            maxLength={20}
            placeholder={t('auth.nicknamePlaceholder')}
            autoFocus
          />
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={busy || name.trim().length < 3}
          data-testid="play-as-guest"
        >
          {t('auth.playAsGuest')}
        </Button>
      </form>
      {GOOGLE_CLIENT_ID ? (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={(r) => r.credential && void signInWithGoogle(r.credential)}
              text="signin_with"
              theme="filled_black"
            />
          </div>
        </GoogleOAuthProvider>
      ) : null}
    </Card>
  );
}
