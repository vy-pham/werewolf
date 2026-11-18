import { createApi, createRealtime, createSessionStore, createVoice } from '@werewolf/client-core';
import { API_URL } from './config';
import { appStorage } from './storage';
import { voicePlatform } from './voice-platform';

/** Mobile wiring of the shared client (same logic as apps/web, different storage and audio). */
export const useSession = createSessionStore(appStorage);

const apiClient = createApi({ apiUrl: API_URL, session: useSession });
export const { api, refreshSession, freshAccessToken, logout } = apiClient;

export const realtime = createRealtime({ apiUrl: API_URL, auth: apiClient });
export const { socket, call, joinRoom } = realtime;

export const voice = createVoice({ call: realtime.call, platform: voicePlatform });
export const { useVoice, startVoice, stopVoice, toggleMic } = voice;

realtime.setHandlers({
  onVoiceUpdate: (grants) => void voice.onVoiceUpdate(grants),
  onKicked: () => void voice.stopVoice(),
});
