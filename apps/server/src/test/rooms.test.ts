import type { RoomSummary, RoomView } from '@werewolf/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  guest,
  http,
  setupLobby,
  startMongo,
  startServer,
  stopMongo,
  TestClient,
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

async function client(name: string) {
  const c = new TestClient(server.url, await guest(server.url, name));
  await c.connected();
  return c;
}

describe('rooms', () => {
  it('creates a room with a 6-char code and the host in seat 1', async () => {
    const host = await guest(server.url, 'Hosty');
    const res = await http<RoomView>(
      server.url,
      'POST',
      '/rooms',
      { visibility: 'public', name: 'Night owls', lang: 'vi' },
      host.accessToken,
    );
    expect(res.status).toBe(201);
    expect(res.body.code).toMatch(/^[A-Z0-9]{6}$/);
    expect(res.body.members).toEqual([
      expect.objectContaining({ userId: host.user.id, seat: 1, ready: false }),
    ]);
    expect(res.body.settings.rules.witchCanSelfHeal).toBe(true);

    const list = await http<RoomSummary[]>(server.url, 'GET', '/rooms?lang=vi');
    expect(list.body.map((r) => r.code)).toContain(res.body.code);
  });

  it('players join by code, see each other and get the next free seat', async () => {
    const { clients, code } = await setupLobby(server, 3);
    const [a, b, c] = clients;
    await until(() => (a?.room?.members.length ?? 0) === 3);
    expect(a?.room?.members.map((m) => m.seat)).toEqual([1, 2, 3]);
    expect(a?.room?.members.every((m) => m.online)).toBe(true);

    // Re-joining is idempotent.
    const again = await c?.call<RoomView>('room:join', { code: code.toLowerCase() });
    expect(again?.members).toHaveLength(3);
    expect(b?.room?.code).toBe(code);
    for (const x of clients) x.close();
  });

  it('only the host can change settings; invalid settings are rejected', async () => {
    const { clients } = await setupLobby(server, 2);
    const [host, other] = clients;
    const denied = await other?.request('room:updateSettings', {
      rules: { revealRoleOnDeath: true },
    });
    expect(denied).toMatchObject({ ok: false, error: { code: 'NOT_HOST' } });

    const updated = await host?.call<RoomView>('room:updateSettings', {
      rules: { revealRoleOnDeath: true, voteTieBreak: 'revote' },
      timers: { speakingSeconds: 45 },
    });
    expect(updated?.settings.rules).toMatchObject({
      revealRoleOnDeath: true,
      voteTieBreak: 'revote',
    });
    expect(updated?.settings.rules.witchCanSelfHeal).toBe(true); // untouched defaults kept
    expect(updated?.settings.timers.speakingSeconds).toBe(45);

    const invalid = await host?.request('room:updateSettings', { timers: { speakingSeconds: 1 } });
    expect(invalid).toMatchObject({ ok: false, error: { code: 'VALIDATION_FAILED' } });
    for (const x of clients) x.close();
  });

  it('the host can kick a player', async () => {
    const { clients } = await setupLobby(server, 3);
    const [host, , victim] = clients;
    await host?.call('room:kick', { userId: victim?.id });
    await until(() => victim?.kicked === true);
    await until(() => host?.room?.members.length === 2);
    for (const x of clients) x.close();
  });

  it('cannot start with fewer than 6 players or when someone is not ready', async () => {
    const small = await setupLobby(server, 5);
    const tooFew = await small.host.request('game:start', {});
    expect(tooFew).toMatchObject({ ok: false, error: { code: 'INVALID_ROLE_SET' } });
    for (const x of small.clients) x.close();

    const { clients, host } = await setupLobby(server, 6);
    await clients[3]?.call('room:ready', { ready: false });
    const notReady = await host.request('game:start', {});
    expect(notReady).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
    for (const x of clients) x.close();
  });

  it('nobody new can join once the game has started; members can re-join', async () => {
    const { clients, host, code } = await setupLobby(server, 6);
    await host.call('game:start', {});
    const late = await client('Latecomer');
    const res = await late.request('room:join', { code });
    expect(res).toMatchObject({ ok: false, error: { code: 'ROOM_NOT_IN_LOBBY' } });
    const rejoin = await clients[2]?.call<RoomView>('room:join', { code });
    expect(rejoin?.status).toBe('in_game');
    late.close();
    for (const x of clients) x.close();
  });

  it('host leaving hands the room to the next player', async () => {
    const { clients, host } = await setupLobby(server, 3);
    await host.call('room:leave', {});
    const other = clients[1];
    await until(() => other?.room?.members.length === 2);
    expect(other?.room?.hostId).toBe(other?.id);
    for (const x of clients) x.close();
  });
});

describe('concurrent settings updates', () => {
  it('keeps every change when the host edits several fields at once', async () => {
    const { clients, host } = await setupLobby(server, 1);
    await Promise.all([
      host.call('room:updateSettings', { timers: { speakingSeconds: 10 } }),
      host.call('room:updateSettings', { timers: { voteSeconds: 15 } }),
      host.call('room:updateSettings', { timers: { nightActionSeconds: 20 } }),
      host.call('room:updateSettings', { rules: { revealRoleOnDeath: true } }),
    ]);
    const room = await host.call<RoomView>('room:join', { code: host.room?.code });
    expect(room.settings.timers).toMatchObject({
      speakingSeconds: 10,
      voteSeconds: 15,
      nightActionSeconds: 20,
    });
    expect(room.settings.rules.revealRoleOnDeath).toBe(true);
    for (const x of clients) x.close();
  });

  it('switching back to the role preset clears custom roles', async () => {
    const { clients, host } = await setupLobby(server, 1);
    const custom = await host.call<RoomView>('room:updateSettings', {
      roles: { werewolf: 2, villager: 4 },
    });
    expect(custom.autoRoles).toBe(false);
    const preset = await host.call<RoomView>('room:updateSettings', { autoRoles: true, roles: {} });
    expect(preset.autoRoles).toBe(true);
    for (const x of clients) x.close();
  });
});
