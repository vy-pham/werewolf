import { LOCALE_NAMES } from '@werewolf/i18n';
import { SUPPORTED_LOCALES } from '@werewolf/shared';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setLocale } from '@/lib/i18n';
import { socket } from '@/lib/socket';

// M0 placeholder screen: proves shared packages, i18n and the socket connection work on device.
// Styling moves to NativeWind in M5.
export default function Home() {
  const { t, i18n } = useTranslation();
  const [online, setOnline] = useState(socket.connected);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    socket.on('connect', up);
    socket.on('disconnect', down);
    socket.on('connect_error', down);
    socket.connect();
    return () => {
      socket.off('connect', up);
      socket.off('disconnect', down);
      socket.off('connect_error', down);
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.langRow}>
        {SUPPORTED_LOCALES.map((l) => (
          <Pressable key={l} onPress={() => setLocale(l)}>
            <Text style={[styles.lang, i18n.language === l && styles.langActive]}>
              {LOCALE_NAMES[l]}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.center}>
        <Text style={styles.title}>{t('app.name')}</Text>
        <Text style={styles.tagline}>{t('app.tagline')}</Text>
        <Text style={styles.status}>
          {online ? '🟢' : '🔴'} {online ? t('status.serverOnline') : t('status.serverOffline')}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0d24', paddingHorizontal: 16 },
  langRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, paddingVertical: 12 },
  lang: { color: '#9ca3af' },
  langActive: { color: '#fde68a', fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  title: { color: '#fde68a', fontSize: 34, fontWeight: '700', textAlign: 'center' },
  tagline: { color: '#d1d5db', textAlign: 'center' },
  status: { color: '#9ca3af', fontSize: 13 },
});
