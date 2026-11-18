import type { Channel, VoiceGrants, VoiceJoinInfo } from '@werewolf/shared';
import { type Participant, type RemoteTrack, Room, RoomEvent, Track } from 'livekit-client';
import { create } from 'zustand';

export interface VoiceState {
  /** The player chose to join voice (needed for mic permission and audio autoplay). */
  active: boolean;
  enabled: boolean;
  micOn: boolean;
  grants: VoiceGrants;
  connected: Channel[];
  /** Identities (user ids) currently speaking in any room. */
  speaking: string[];
  /** Remote audio tracks currently playing. */
  remoteAudio: number;
  error: string | null;
}

/** What differs per platform: how remote audio is played and the OS audio session. */
export interface VoicePlatform {
  /** Plays a remote audio track; returns a cleanup. The web attaches an <audio> element. */
  attachAudio?: (track: RemoteTrack) => () => void;
  /** Called before the first room connects (mobile: start the native audio session). */
  start?: () => Promise<void>;
  /** Called after the last room disconnects. */
  stop?: () => Promise<void>;
}

/**
 * LiveKit voice: one Room per channel (lobby, or main / wolves / dead during a game). The server
 * decides who may speak or listen; this only follows `voice:join` / `voice:update`.
 */
export function createVoice({
  call,
  platform = {},
}: {
  call: <T>(event: 'voice:join', payload: unknown) => Promise<T>;
  platform?: VoicePlatform;
}) {
  const useVoice = create<VoiceState>()(() => ({
    active: false,
    enabled: true,
    micOn: true,
    grants: {},
    connected: [],
    speaking: [],
    remoteAudio: 0,
    error: null,
  }));

  const rooms = new Map<Channel, { name: string; room: Room }>();
  const cleanups = new Map<RemoteTrack, () => void>();
  let queue: Promise<void> = Promise.resolve();

  /** Serializes (re)connections so rapid updates (phase changes) never race each other. */
  const enqueue = (work: () => Promise<void>) => {
    queue = queue.then(work).catch((error: unknown) => {
      useVoice.setState({ error: error instanceof Error ? error.message : String(error) });
    });
    return queue;
  };

  function refreshDerivedState() {
    const speaking = new Set<string>();
    let remoteAudio = 0;
    for (const { room } of rooms.values()) {
      for (const p of room.activeSpeakers) speaking.add(p.identity);
      for (const p of room.remoteParticipants.values()) {
        for (const pub of p.audioTrackPublications.values()) {
          if (pub.isSubscribed && pub.track) remoteAudio++;
        }
      }
    }
    useVoice.setState({ speaking: [...speaking], remoteAudio, connected: [...rooms.keys()] });
  }

  async function applyMic() {
    const { micOn, grants } = useVoice.getState();
    for (const [channel, { room }] of rooms) {
      const allowed =
        grants[channel]?.publish === true &&
        room.localParticipant.permissions?.canPublish !== false;
      try {
        await room.localParticipant.setMicrophoneEnabled(micOn && allowed);
      } catch {
        // Not applied on the server yet; ParticipantPermissionsChanged retries.
      }
    }
    refreshDerivedState();
  }

  function createRoom(): Room {
    const room = new Room({ adaptiveStream: false, dynacast: false });
    room
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio && platform.attachAudio) {
          cleanups.set(track, platform.attachAudio(track));
        }
        refreshDerivedState();
      })
      .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        cleanups.get(track)?.();
        cleanups.delete(track);
        refreshDerivedState();
      })
      .on(RoomEvent.ActiveSpeakersChanged, refreshDerivedState)
      .on(RoomEvent.ParticipantPermissionsChanged, (_prev, participant: Participant) => {
        if (participant === room.localParticipant) void enqueue(applyMic);
        refreshDerivedState();
      })
      .on(RoomEvent.Disconnected, refreshDerivedState);
    return room;
  }

  async function disconnectAll() {
    for (const { room } of rooms.values()) await room.disconnect();
    rooms.clear();
    await platform.stop?.();
    refreshDerivedState();
  }

  /** Fetches tokens for the current context and connects / disconnects rooms to match. */
  async function reconcile() {
    if (!useVoice.getState().active) return;
    const info = await call<VoiceJoinInfo>('voice:join', {});
    useVoice.setState({ enabled: info.enabled, grants: info.grants, error: null });
    const wanted = new Map(info.enabled ? info.connections.map((c) => [c.channel, c]) : []);

    for (const [channel, entry] of rooms) {
      if (wanted.get(channel)?.room !== entry.name) {
        rooms.delete(channel);
        await entry.room.disconnect();
      }
    }
    if (rooms.size === 0 && wanted.size > 0) await platform.start?.();
    for (const c of wanted.values()) {
      if (rooms.has(c.channel)) continue;
      const room = createRoom();
      rooms.set(c.channel, { name: c.room, room });
      await room.connect(info.url, c.token, { autoSubscribe: true });
      await room.startAudio().catch(() => undefined);
    }
    await applyMic();
  }

  return {
    useVoice,
    startVoice: () => {
      useVoice.setState({ active: true });
      return enqueue(reconcile);
    },
    stopVoice: () => {
      useVoice.setState({ active: false, grants: {} });
      return enqueue(disconnectAll);
    },
    toggleMic: () => {
      useVoice.setState((s) => ({ micOn: !s.micOn }));
      return enqueue(applyMic);
    },
    /** Server pushed new grants (phase change, death, game start/end). */
    onVoiceUpdate: (grants: VoiceGrants) => {
      useVoice.setState({ grants });
      return enqueue(reconcile);
    },
  };
}

export type VoiceClient = ReturnType<typeof createVoice>;
