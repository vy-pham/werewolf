import type { VoicePlatform } from '@werewolf/client-core';
import type { RemoteTrack } from 'livekit-client';

/** Web build of the mobile app (used for automated tests): play audio with <audio> elements. */
let host: HTMLDivElement | null = null;

export const voicePlatform: VoicePlatform = {
  attachAudio: (track: RemoteTrack) => {
    if (!host) {
      host = document.createElement('div');
      host.hidden = true;
      document.body.appendChild(host);
    }
    host.appendChild(track.attach());
    return () => {
      for (const el of track.detach()) el.remove();
    };
  },
};
