import type { CaptionIngest, CaptionIngestResult, CaptionRoomsResult } from '@werewolf/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parseVoiceRoom } from '../modules/captions/captions.service';
import { Transcript } from '../modules/captions/transcript.model';
import { gameVoiceRoom, lobbyVoiceRoom } from '../modules/voice/voice.service';
import {
  CAPTIONS_TEST_SECRET,
  http,
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

const worker = (secret = CAPTIONS_TEST_SECRET) => ({
  rooms: () =>
    http<CaptionRoomsResult>(server.url, 'GET', '/internal/captions/rooms', undefined, secret),
  ingest: (body: CaptionIngest) =>
    http<CaptionIngestResult>(server.url, 'POST', '/internal/captions', body, secret),
});

async function lobbyWithCaptions(n: number) {
  const lobby = await setupLobby(server, n);
  await lobby.host.call('room:updateSettings', { captions: true });
  return lobby;
}

const closeAll = (clients: TestClient[]) => {
  for (const c of clients) c.close();
};

describe('captions', () => {
  it('parses LiveKit room names', () => {
    const id = '0123456789abcdef01234567';
    expect(parseVoiceRoom(lobbyVoiceRoom(id))).toEqual({ kind: 'lobby', roomId: id });
    expect(parseVoiceRoom(gameVoiceRoom(id, 'wolves'))).toEqual({
      kind: 'game',
      gameId: id,
      channel: 'wolves',
    });
    expect(parseVoiceRoom(`game-${id}-lobby`)).toBeNull();
    expect(parseVoiceRoom('random')).toBeNull();
  });

  it('rejects requests without the worker secret', async () => {
    expect((await worker('wrong-secret').rooms()).status).toBe(401);
    const res = await worker('').ingest({ room: 'x', speakerId: 'y', lang: 'en', text: 'hi' });
    expect(res.status).toBe(401);
  });

  it('lists only rooms with captions on, with listen-only tokens', async () => {
    const off = await setupLobby(server, 2);
    const on = await lobbyWithCaptions(2);
    const res = await worker().rooms();
    expect(res.status).toBe(200);
    const names = res.body.rooms.map((r) => r.room);
    expect(names).toContain(lobbyVoiceRoom(on.roomId));
    expect(names).not.toContain(lobbyVoiceRoom(off.roomId));
    expect(res.body.rooms.find((r) => r.room === lobbyVoiceRoom(on.roomId))?.token).toBe(
      `listener:${lobbyVoiceRoom(on.roomId)}:captions-bot`,
    );
    closeAll([...off.clients, ...on.clients]);
  });

  it('lobby: everyone reads the caption in their own language; transcript kept', async () => {
    const { clients, roomId } = await lobbyWithCaptions(3);
    const [a, b, c] = clients as [TestClient, TestClient, TestClient];
    await http(server.url, 'PATCH', '/me', { captionLangs: ['vi'] }, b.auth.accessToken);

    const res = await worker().ingest({
      room: lobbyVoiceRoom(roomId),
      speakerId: a.id,
      lang: 'en',
      text: 'Hello everyone',
      translations: { vi: 'Xin chào mọi người' },
    });
    expect(res.body).toEqual({ delivered: 3, wanted: expect.arrayContaining(['en', 'vi']) });
    await until(() => clients.every((x) => x.captions.length === 1));

    expect(a.captions[0]).toMatchObject({
      channel: 'lobby',
      speakerId: a.id,
      speakerName: 'Player1',
      text: 'Hello everyone',
      lang: 'en',
    });
    expect(b.captions[0]).toMatchObject({
      text: 'Xin chào mọi người',
      lang: 'vi',
      original: 'Hello everyone',
      sourceLang: 'en',
    });
    expect(c.captions[0]?.text).toBe('Hello everyone');
    expect(await Transcript.countDocuments({ speakerId: a.id })).toBe(1);
    closeAll(clients);
  });

  it('missing translation falls back to the original text', async () => {
    const { clients, roomId } = await lobbyWithCaptions(2);
    const [a, b] = clients as [TestClient, TestClient];
    await http(server.url, 'PATCH', '/me', { captionLangs: ['vi'] }, b.auth.accessToken);
    await worker().ingest({
      room: lobbyVoiceRoom(roomId),
      speakerId: a.id,
      lang: 'en',
      text: 'Hi',
    });
    await until(() => b.captions.length === 1);
    expect(b.captions[0]).toMatchObject({ text: 'Hi', lang: 'en' });
    closeAll(clients);
  });

  it('no captions when the host turned them off, or from a non-member', async () => {
    const { clients, roomId, host } = await setupLobby(server, 2);
    const off = await worker().ingest({
      room: lobbyVoiceRoom(roomId),
      speakerId: host.id,
      lang: 'en',
      text: 'secret',
    });
    expect(off.body.delivered).toBe(0);
    await host.call('room:updateSettings', { captions: true });
    const stranger = await worker().ingest({
      room: lobbyVoiceRoom(roomId),
      speakerId: '0123456789abcdef01234567',
      lang: 'en',
      text: 'who am I',
    });
    expect(stranger.body.delivered).toBe(0);
    await settle();
    expect(clients.every((c) => c.captions.length === 0)).toBe(true);
    closeAll(clients);
  });

  it('game: wolves captions reach wolves only; main is silent at night', async () => {
    const lobby = await lobbyWithCaptions(6);
    const { gameId } = await lobby.host.call<{ gameId: string }>('game:start', {});
    await until(() => lobby.clients.every((c) => c.view !== null));
    while (lobby.clients[0]?.view?.phase.name !== 'NIGHT') {
      await server.scheduler.fire(gameId);
      await settle();
    }
    const wolves = lobby.clients.filter((c) => c.view?.me?.role === 'werewolf');
    const others = lobby.clients.filter((c) => c.view?.me?.role !== 'werewolf');
    const [wolf] = wolves as [TestClient];
    const [villager] = others as [TestClient];

    const rooms = (await worker().rooms()).body.rooms.map((r) => r.room);
    expect(rooms).toEqual(
      expect.arrayContaining(['main', 'wolves', 'dead'].map((ch) => `game-${gameId}-${ch}`)),
    );
    expect(rooms).not.toContain(lobbyVoiceRoom(lobby.roomId));

    const wolfTalk = await worker().ingest({
      room: gameVoiceRoom(gameId, 'wolves'),
      speakerId: wolf.id,
      lang: 'vi',
      text: 'Cắn người số 3',
    });
    expect(wolfTalk.body.delivered).toBe(wolves.length);
    await until(() => wolves.every((w) => w.captions.length === 1));

    // A villager's audio can never be captioned on the wolves' channel.
    const fake = await worker().ingest({
      room: gameVoiceRoom(gameId, 'wolves'),
      speakerId: villager.id,
      lang: 'vi',
      text: 'xx',
    });
    expect(fake.body.delivered).toBe(0);
    // Nobody may listen to main at night.
    const night = await worker().ingest({
      room: gameVoiceRoom(gameId, 'main'),
      speakerId: villager.id,
      lang: 'vi',
      text: 'yy',
    });
    expect(night.body.delivered).toBe(0);

    await settle();
    expect(others.every((c) => c.captions.length === 0)).toBe(true);
    expect(wolves.every((w) => w.captions.length === 1)).toBe(true);
    closeAll(lobby.clients);
  });
});
