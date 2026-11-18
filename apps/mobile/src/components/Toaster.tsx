import { useToast } from '@werewolf/client-core';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function Toaster() {
  const { toasts, dismiss } = useToast();
  return (
    <View pointerEvents="box-none" style={styles.host}>
      {toasts.map((t) => (
        <Pressable
          key={t.id}
          testID="toast"
          onPress={() => dismiss(t.id)}
          style={[styles.toast, { backgroundColor: t.tone === 'error' ? '#991b1b' : '#1f2937' }]}
        >
          <Text style={styles.text}>{t.text}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 16, right: 16, bottom: 32, gap: 8, alignItems: 'center' },
  toast: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, maxWidth: 420 },
  text: { color: '#fff' },
});
