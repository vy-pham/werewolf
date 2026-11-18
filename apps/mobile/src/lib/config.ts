import Constants from 'expo-constants';

/**
 * Base URL of apps/server.
 * - EXPO_PUBLIC_API_URL wins (set it for staging/production builds).
 * - In development, reuse the host of the Metro dev server so a physical device on the same
 *   Wi-Fi reaches the server running on your machine.
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv;
  const host = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';
  return `http://${host}:4000`;
}

export const API_URL = resolveApiUrl();
