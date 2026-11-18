import { AudioSession, registerGlobals } from '@livekit/react-native';
import type { VoicePlatform } from '@werewolf/client-core';

// WebRTC globals for livekit-client must exist before any Room is created.
registerGlobals();

/** On Android/iOS remote audio plays by itself; we only manage the OS audio session. */
export const voicePlatform: VoicePlatform = {
  start: () => AudioSession.startAudioSession(),
  stop: () => AudioSession.stopAudioSession(),
};
