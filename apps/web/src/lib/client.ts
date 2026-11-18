import {
  createApi,
  createRealtime,
  createSessionStore,
  createVoice,
  safeLocalStorage,
} from '@werewolf/client-core';
import type { RemoteTrack } from 'livekit-client';
import { API_URL } from './config';

/** Web wiring of the shared client: localStorage session, <audio> elements for voice. */
export const useSession = createSessionStore(safeLocalStorage);

const apiClient = createApi({ apiUrl: API_URL, session: useSession });
export const { api, refreshSession, freshAccessToken, logout, updateMe } = apiClient;

export const realtime = createRealtime({ apiUrl: API_URL, auth: apiClient });

let audioHost: HTMLDivElement | null = null;
function attachAudio(track: RemoteTrack) {
  if (!audioHost) {
    audioHost = document.createElement('div');
    audioHost.hidden = true;
    audioHost.dataset.testid = 'voice-audio';
    document.body.appendChild(audioHost);
  }
  audioHost.appendChild(track.attach());
  return () => {
    for (const el of track.detach()) el.remove();
  };
}

export const voice = createVoice({ call: realtime.call, platform: { attachAudio } });

realtime.setHandlers({
  onVoiceUpdate: (grants) => void voice.onVoiceUpdate(grants),
  onKicked: () => void voice.stopVoice(),
});
