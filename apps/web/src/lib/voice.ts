import type { Channel, VoiceGrants, VoiceJoinInfo } from '@werewolf/shared';
import { type Participant, type RemoteTrack, Room, RoomEvent, Track } from 'livekit-client';
import { create } from 'zustand';
import { call } from './socket';

interface VoiceState {
  /** The player clicked "Join voice" (needed for mic permission and audio autoplay). */
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

export const useVoice = create<VoiceState>()(() => ({
  active: false,
  enabled: true,
  micOn: true,
  grants: {},
  connected: [],
  speaking: [],
  remoteAudio: 0,
  error: null,
}));

/** One LiveKit room per channel (lobby, or main / wolves / dead during a game). */
const rooms = new Map<Channel, { name: string; room: Room }>();
let audioHost: HTMLDivElement | null = null;
let queue: Promise<void> = Promise.resolve();

/** Serializes reconnections so rapid updates (phase changes) never race each other. */
const enqueue = (work: () => Promise<void>) => {
  queue = queue.then(work).catch((error: unknown) => {
    useVoice.setState({ error: error instanceof Error ? error.message : String(error) });
  });
  return queue;
};

function host(): HTMLDivElement {
  if (!audioHost) {
    audioHost = document.createElement('div');
    audioHost.hidden = true;
    audioHost.dataset.testid = 'voice-audio';
    document.body.appendChild(audioHost);
  }
  return audioHost;
}

function refreshDerivedState() {
  const speaking = new Set<string>();
  let remoteAudio = 0;
  for (const { room } of rooms.values()) {
    for (const p of room.activeSpeakers) speaking.add(p.identity);
    for (const p of room.remoteParticipants.values()) {
      for (const pub of p.audioTrackPublications.values())
        if (pub.isSubscribed && pub.track) remoteAudio++;
    }
  }
  useVoice.setState({ speaking: [...speaking], remoteAudio, connected: [...rooms.keys()] });
}

function createRoom(): Room {
  const room = new Room({ adaptiveStream: false, dynacast: false });
  room
    .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Audio) host().appendChild(track.attach());
      refreshDerivedState();
    })
    .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
      for (const el of track.detach()) el.remove();
      refreshDerivedState();
    })
    .on(RoomEvent.ActiveSpeakersChanged, refreshDerivedState)
    .on(RoomEvent.ParticipantPermissionsChanged, (_prev, participant: Participant) => {
      // The server opened or closed our mic: (re)publish or stop accordingly.
      if (participant === room.localParticipant) void enqueue(applyMic);
      refreshDerivedState();
    })
    .on(RoomEvent.Disconnected, refreshDerivedState);
  return room;
}

async function applyMic() {
  const { micOn, grants } = useVoice.getState();
  for (const [channel, { room }] of rooms) {
    const allowed =
      grants[channel]?.publish === true && room.localParticipant.permissions?.canPublish !== false;
    try {
      await room.localParticipant.setMicrophoneEnabled(micOn && allowed);
    } catch {
      // Permission not applied yet on the server side; ParticipantPermissionsChanged retries.
    }
  }
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
  for (const c of wanted.values()) {
    if (rooms.has(c.channel)) continue;
    const room = createRoom();
    rooms.set(c.channel, { name: c.room, room });
    await room.connect(info.url, c.token, { autoSubscribe: true });
    await room.startAudio().catch(() => undefined);
  }
  await applyMic();
}

export function startVoice() {
  useVoice.setState({ active: true });
  return enqueue(reconcile);
}

export function stopVoice() {
  useVoice.setState({ active: false, grants: {} });
  return enqueue(async () => {
    for (const { room } of rooms.values()) await room.disconnect();
    rooms.clear();
    refreshDerivedState();
  });
}

export function toggleMic() {
  useVoice.setState((s) => ({ micOn: !s.micOn }));
  return enqueue(applyMic);
}

/** Server pushed new grants (phase change, death, game start/end). */
export function onVoiceUpdate(grants: VoiceGrants) {
  useVoice.setState({ grants });
  return enqueue(reconcile);
}
