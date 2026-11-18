import type { VoiceJoinInfo } from '@werewolf/shared';
import { decodeJwt } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LiveKitVoice } from '../modules/voice/voice.provider';
import { gameVoiceRoom, lobbyVoiceRoom } from '../modules/voice/voice.service';
import {
  settle,
  setupLobby,
  startMongo,
  startServer,
  stopMongo,
  type TestClient,
  type TestServer,
  until,
} from './helpers';

let server: TestServer;

beforeAll(async () => {
  server = await startServer(await startMongo());
});

afterAll(async () => {
  await server.close();
  await stopMongo();
});

const TALK = { publish: true, subscribe: true };
const LISTEN = { publish: false, subscribe: true };
const NONE = { publish: false, subscribe: false };

const join = (c: TestClient) => c.call<VoiceJoinInfo>('voice:join', {});

/** Starts a 6-player game and moves it to `phase`. */
async function startGame(phase: 'NIGHT' | 'DISCUSSION') {
  const lobby = await setupLobby(server, 6);
  const { gameId } = await lobby.host.call<{ gameId: string }>('game:start', {});
  await until(() => lobby.clients.every((c) => c.view !== null));
  while (lobby.clients[0]?.view?.phase.name !== phase) {
    await server.scheduler.fire(gameId);
    await settle();
  }
  const wolves = lobby.clients.filter((c) => c.view?.me?.role === 'werewolf');
  const villagers = lobby.clients.filter((c) => c.view?.me?.role !== 'werewolf');
  return { ...lobby, gameId, wolves, villagers };
}

describe('voice', () => {
  it('lobby: every member gets one lobby room where they can talk', async () => {
    const { clients, roomId } = await setupLobby(server, 2);
    const info = await join(clients[0] as TestClient);
    expect(info).toMatchObject({
      enabled: true,
      url: 'ws://fake-livekit',
      grants: { lobby: TALK },
    });
    expect(info.connections).toEqual([
      { channel: 'lobby', room: lobbyVoiceRoom(roomId), token: expect.any(String) },
    ]);
    for (const c of clients) c.close();
  });

  it('is disabled when the host turns voice off', async () => {
    const { clients, host } = await setupLobby(server, 1);
    await host.call('room:updateSettings', { voice: false });
    expect(await join(host)).toMatchObject({ enabled: false, connections: [] });
    for (const c of clients) c.close();
  });

  it('night: wolves get a private room; villagers can neither talk nor listen', async () => {
    const { clients, gameId, roomId, wolves, villagers } = await startGame('NIGHT');
    const wolf = wolves[0] as TestClient;
    const villager = villagers[0] as TestClient;

    const wolfInfo = await join(wolf);
    expect(wolfInfo.connections.map((c) => c.channel)).toEqual(['main', 'wolves']);
    expect(wolfInfo.grants).toEqual({ main: NONE, wolves: TALK });

    const villagerInfo = await join(villager);
    expect(villagerInfo.connections.map((c) => c.channel)).toEqual(['main']);
    expect(villagerInfo.grants).toEqual({ main: NONE });
    // No token for the wolves' room was ever issued to a villager.
    for (const v of villagers) {
      expect(
        server.voice.tokens.some((t) => t.identity === v.id && t.room.endsWith('-wolves')),
      ).toBe(false);
    }

    // Permissions were pushed to LiveKit for already-connected participants.
    expect(server.voice.latest(gameVoiceRoom(gameId, 'wolves'), wolf.id)).toEqual(TALK);
    expect(server.voice.latest(gameVoiceRoom(gameId, 'main'), villager.id)).toEqual(NONE);
    expect(server.voice.latest(lobbyVoiceRoom(roomId), villager.id)).toEqual(NONE);
    await until(() => villager.voiceUpdates.at(-1)?.main?.subscribe === false);
    for (const c of clients) c.close();
  });

  it('discussion: only the current speaker talks; a vote does not re-push permissions', async () => {
    const { clients, gameId } = await startGame('DISCUSSION');
    const speakerId = clients[0]?.view?.speakerId;
    const speaker = clients.find((c) => c.id === speakerId) as TestClient;
    const listener = clients.find((c) => c.id !== speakerId && c.view?.me?.alive) as TestClient;
    const main = gameVoiceRoom(gameId, 'main');
    expect(server.voice.latest(main, speaker.id)).toEqual(TALK);
    expect(server.voice.latest(main, listener.id)).toEqual(LISTEN);

    // The floor moves to the next speaker.
    await speaker.call('game:action', { gameId, command: { type: 'END_TURN' } });
    await settle();
    expect(server.voice.latest(main, speaker.id)).toEqual(LISTEN);
    const next = clients[0]?.view?.speakerId as string;
    expect(server.voice.latest(main, next)).toEqual(TALK);

    // Jump to the vote: voting changes the state but not anybody's voice grants.
    while (clients[0]?.view?.phase.name !== 'VOTE') {
      await server.scheduler.fire(gameId);
      await settle();
    }
    const before = server.voice.calls.length;
    await listener.call('game:action', { gameId, command: { type: 'DAY_VOTE', targetId: null } });
    await settle();
    expect(server.voice.calls.length).toBe(before);
    for (const c of clients) c.close();
  });

  it('a dead player gets the graveyard room', async () => {
    const { clients, gameId } = await startGame('NIGHT');
    const wolf = clients.find((c) => c.view?.me?.role === 'werewolf') as TestClient;
    const prey = clients.find((c) => c.view?.me?.role !== 'werewolf') as TestClient;
    for (const w of clients.filter((c) => c.view?.me?.role === 'werewolf')) {
      await w.call('game:action', { gameId, command: { type: 'WOLF_VOTE', targetId: prey.id } });
    }
    while (clients[0]?.view?.phase.name !== 'DAWN') {
      await server.scheduler.fire(gameId);
      await settle();
    }
    const info = await join(prey);
    expect(info.connections.map((c) => c.channel)).toEqual(['main', 'dead']);
    expect(info.grants.dead).toEqual(TALK);
    expect(wolf.id).not.toBe(prey.id);
    for (const c of clients) c.close();
  });
});

describe('LiveKitVoice tokens', () => {
  it('encode the room and the permissions in the video grant', async () => {
    const lk = new LiveKitVoice('ws://localhost:7880', 'devkey', 'secret');
    const jwt = await lk.createToken({
      room: 'game-1-wolves',
      identity: 'u1',
      name: 'Wolfy',
      grant: LISTEN,
    });
    const claims = decodeJwt(jwt) as { sub?: string; video?: Record<string, unknown> };
    expect(claims.sub).toBe('u1');
    expect(claims.video).toMatchObject({
      room: 'game-1-wolves',
      roomJoin: true,
      canPublish: false,
      canSubscribe: true,
      canPublishData: false,
    });
  });
});

describe('voice at game start', () => {
  it('voice:join right after the start already returns the game rooms, not the lobby', async () => {
    const { clients, host } = await setupLobby(server, 6);
    const { gameId } = await host.call<{ gameId: string }>('game:start', {});
    // Every player was told to switch, and joining now yields the game's main room.
    for (const c of clients) {
      await until(() => c.voiceUpdates.some((g) => g.main !== undefined));
      const info = await join(c);
      expect(info.connections.map((x) => x.room)).toContain(gameVoiceRoom(gameId, 'main'));
      expect(info.connections.some((x) => x.channel === 'lobby')).toBe(false);
    }
    for (const c of clients) c.close();
  });
});
