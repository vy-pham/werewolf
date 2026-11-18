import '@/lib/i18n';
import { useGame } from '@werewolf/client-core';
import { SUPPORTED_LOCALES } from '@werewolf/shared';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Toaster } from '@/components/Toaster';
import { colors } from '@/components/theme';
import { logout, socket, stopVoice, useSession } from '@/lib/client';
import { setLocale } from '@/lib/i18n';

function Header() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const user = useSession((s) => s.user);
  const connected = useGame((s) => s.connected);

  const signOut = async () => {
    await stopVoice();
    socket.disconnect();
    useGame.getState().leaveRoom();
    await logout();
    router.replace('/');
  };

  return (
    <View style={styles.header}>
      <Pressable onPress={() => router.replace('/')}>
        <Text style={styles.brand}>🐺 {t('app.name')}</Text>
      </Pressable>
      <View style={styles.flex} />
      {user ? (
        <>
          <View style={[styles.dot, { backgroundColor: connected ? '#22c55e' : '#6b7280' }]} />
          <Text style={styles.user} testID="current-user" numberOfLines={1}>
            {user.displayName}
          </Text>
          <Pressable onPress={signOut} testID="sign-out">
            <Text style={styles.link}>{t('auth.signOut')}</Text>
          </Pressable>
        </>
      ) : null}
      {SUPPORTED_LOCALES.map((l) => (
        <Pressable key={l} onPress={() => setLocale(l)}>
          <Text style={[styles.lang, i18n.language === l && styles.langActive]}>
            {l.toUpperCase()}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <StatusBar style="light" />
        <Header />
        <Stack
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.night } }}
        />
        <Toaster />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  brand: { color: colors.moon, fontWeight: '700' },
  flex: { flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  user: { color: colors.text, maxWidth: 100 },
  link: { color: colors.muted },
  lang: { color: colors.faint, fontSize: 12 },
  langActive: { color: colors.moon, fontWeight: '700' },
});
