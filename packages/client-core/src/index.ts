// Client logic shared by apps/web and apps/mobile. Platform-specific pieces (token storage,
// audio playback, API URL) are injected by each app in its `lib/client.ts`.
export { type ApiClient, ApiError, createApi, type RequestOptions } from './api';
export { attempt, errorMessage } from './errors';
export * from './game-store';
export * from './game-ui';
export {
  type AppSocket,
  createRealtime,
  type Realtime,
  type RealtimeHandlers,
  SocketError,
} from './realtime';
export {
  createSessionStore,
  type SessionState,
  type SessionStore,
  safeLocalStorage,
} from './session';
export * from './toast';
export { createVoice, type VoiceClient, type VoicePlatform, type VoiceState } from './voice';
