import type { ChannelGrant } from '@werewolf/shared';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

/** The SFU behind voice chat. Injected so tests can record calls instead of talking to LiveKit. */
export interface VoiceProvider {
  /** URL clients connect to (ws:// in dev, wss:// in production). */
  readonly url: string;
  createToken(input: {
    room: string;
    identity: string;
    name: string;
    grant: ChannelGrant;
  }): Promise<string>;
  /** Token for the captions worker: hidden, listen-only (it never publishes anything). */
  createListenerToken(input: { room: string; identity: string }): Promise<string>;
  /** Changes a connected participant's permissions. Not connected → no-op. */
  setPermissions(room: string, identity: string, grant: ChannelGrant): Promise<void>;
}

const TOKEN_TTL = '2h';

/** LiveKit (self-hosted in dev, LiveKit Cloud in production). */
export class LiveKitVoice implements VoiceProvider {
  private readonly rooms: RoomServiceClient;

  constructor(
    readonly url: string,
    private readonly apiKey: string,
    private readonly apiSecret: string,
  ) {
    // The REST API lives on the same host as the WebSocket signaling endpoint.
    this.rooms = new RoomServiceClient(url.replace(/^ws/, 'http'), apiKey, apiSecret);
  }

  async createToken({
    room,
    identity,
    name,
    grant,
  }: {
    room: string;
    identity: string;
    name: string;
    grant: ChannelGrant;
  }) {
    const token = new AccessToken(this.apiKey, this.apiSecret, { identity, name, ttl: TOKEN_TTL });
    token.addGrant({
      room,
      roomJoin: true,
      canPublish: grant.publish,
      canSubscribe: grant.subscribe,
      canPublishData: false,
    });
    return token.toJwt();
  }

  async createListenerToken({ room, identity }: { room: string; identity: string }) {
    const token = new AccessToken(this.apiKey, this.apiSecret, { identity, ttl: TOKEN_TTL });
    token.addGrant({
      room,
      roomJoin: true,
      hidden: true,
      canPublish: false,
      canSubscribe: true,
      canPublishData: false,
    });
    return token.toJwt();
  }

  async setPermissions(room: string, identity: string, grant: ChannelGrant) {
    try {
      await this.rooms.updateParticipant(room, identity, {
        permission: {
          canPublish: grant.publish,
          canSubscribe: grant.subscribe,
          canPublishData: false,
        },
      });
    } catch (error) {
      // The player has not joined this voice room (yet): their next token carries the grant.
      if (isNotFound(error)) return;
      throw error;
    }
  }
}

function isNotFound(error: unknown): boolean {
  const e = error as { status?: number; code?: string; message?: string };
  return (
    e?.status === 404 ||
    e?.code === 'not_found' ||
    /not.?found|does not exist/i.test(e?.message ?? '')
  );
}
