import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Base URL of apps/server.
 * - EXPO_PUBLIC_API_URL wins (set it for preview / production builds).
 * - Web (tests): same host as the page, port 4000.
 * - Dev build on a device/emulator: the host running Metro, port 4000 (same Wi-Fi), or
 *   127.0.0.1 with `adb reverse tcp:4000 tcp:4000`.
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv;
  if (Platform.OS === 'web') return `http://${globalThis.location?.hostname ?? 'localhost'}:4000`;
  const host = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';
  return `http://${host}:4000`;
}

export const API_URL = resolveApiUrl();
