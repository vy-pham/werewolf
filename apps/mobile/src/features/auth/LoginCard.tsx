import { attempt } from '@werewolf/client-core';
import type { AuthResponse, Locale } from '@werewolf/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';
import { Button, Card, styles, TextField } from '@/components/ui';
import { api, useSession } from '@/lib/client';

/** Guest sign-in. Google sign-in on mobile needs native OAuth client IDs (added later). */
export function LoginCard() {
  const { t, i18n } = useTranslation();
  const setAuth = useSession((s) => s.setAuth);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const playAsGuest = async () => {
    setBusy(true);
    await attempt(t, async () =>
      setAuth(
        await api<AuthResponse>('/auth/guest', {
          method: 'POST',
          body: { displayName: name.trim(), locale: i18n.language as Locale },
          auth: false,
        }),
      ),
    );
    setBusy(false);
  };

  return (
    <Card style={{ width: '100%', maxWidth: 380 }}>
      <Text style={styles.muted}>{t('auth.nickname')}</Text>
      <TextField
        testID="nickname"
        value={name}
        onChangeText={setName}
        maxLength={20}
        placeholder={t('auth.nicknamePlaceholder')}
        autoCapitalize="none"
        onSubmitEditing={() => name.trim().length >= 3 && void playAsGuest()}
      />
      <Button
        testID="play-as-guest"
        title={t('auth.playAsGuest')}
        disabled={busy || name.trim().length < 3}
        onPress={playAsGuest}
      />
    </Card>
  );
}
