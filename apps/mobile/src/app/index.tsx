import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { colors } from '@/components/theme';
import { LoginCard } from '@/features/auth/LoginCard';
import { LobbyHome } from '@/features/lobby/LobbyHome';
import { useSession } from '@/lib/client';

export default function Home() {
  const { t } = useTranslation();
  const user = useSession((s) => s.user);
  if (user) return <LobbyHome />;
  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{t('app.name')}</Text>
      <Text style={styles.tagline}>{t('app.tagline')}</Text>
      <LoginCard />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 16, gap: 16 },
  title: { color: colors.moon, fontSize: 34, fontWeight: '700', textAlign: 'center' },
  tagline: { color: colors.text, textAlign: 'center' },
});
