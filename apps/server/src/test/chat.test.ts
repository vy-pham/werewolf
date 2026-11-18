import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  settle,
  setupLobby,
  startMongo,
  startServer,
  stopMongo,
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

describe('chat', () => {
  it('lobby chat reaches everyone in the room; game channels are closed in the lobby', async () => {
    const { clients } = await setupLobby(server, 3);
    const [a, b, c] = clients;
    await a?.call('chat:send', { channel: 'lobby', text: 'hello' });
    await until(() => b?.chat.length === 1 && c?.chat.length === 1);
    expect(b?.chat[0]).toMatchObject({ channel: 'lobby', senderId: a?.id, text: 'hello' });
    const res = await a?.request('chat:send', { channel: 'main', text: 'nope' });
    expect(res).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    for (const x of clients) x.close();
  });

  it('rate-limits to 5 messages per 5 seconds', async () => {
    const { clients } = await setupLobby(server, 1);
    const [a] = clients;
    for (let i = 0; i < 5; i++) await a?.call('chat:send', { channel: 'lobby', text: `m${i}` });
    const res = await a?.request('chat:send', { channel: 'lobby', text: 'too much' });
    expect(res).toMatchObject({ ok: false, error: { code: 'RATE_LIMITED' } });
    for (const x of clients) x.close();
  });

  it('follows turn-based speech during the game', async () => {
    const { clients, host } = await setupLobby(server, 6);
    const { gameId } = await host.call<{ gameId: string }>('game:start', {});
    await until(() => clients.every((c) => c.view !== null));
    const wolves = clients.filter((c) => c.view?.me?.role === 'werewolf');
    const others = clients.filter((c) => c.view?.me?.role !== 'werewolf');

    // Role reveal: nobody may talk, not even wolves.
    const early = await wolves[0]?.request('chat:send', { channel: 'wolves', text: 'hi' });
    expect(early).toMatchObject({ ok: false, error: { code: 'NOT_YOUR_TURN' } });

    // Night step 1: wolves talk privately.
    await server.scheduler.fire(gameId);
    await until(() => clients.every((c) => c.view?.phase.name === 'NIGHT'));
    await wolves[0]?.call('chat:send', { channel: 'wolves', text: 'bite p1?' });
    await until(() => wolves.every((w) => w.chat.some((m) => m.text === 'bite p1?')));
    await settle();
    expect(others.some((o) => o.chat.some((m) => m.channel === 'wolves'))).toBe(false);
    const sneaky = await others[0]?.request('chat:send', { channel: 'wolves', text: 'hey' });
    expect(sneaky).toMatchObject({ ok: false, error: { code: 'NOT_YOUR_TURN' } });
    const shout = await others[0]?.request('chat:send', { channel: 'main', text: 'hey' });
    expect(shout).toMatchObject({ ok: false, error: { code: 'NOT_YOUR_TURN' } });

    // Night step 2 → dawn → discussion: only the current speaker talks on main.
    while (clients[0]?.view?.phase.name !== 'DISCUSSION') {
      await server.scheduler.fire(gameId);
      await settle();
    }
    const speakerId = clients[0]?.view?.speakerId;
    const speaker = clients.find((c) => c.id === speakerId);
    const listener = clients.find((c) => c.id !== speakerId && c.view?.me?.alive);
    await speaker?.call('chat:send', { channel: 'main', text: 'I am innocent' });
    await until(() => clients.every((c) => c.chat.some((m) => m.text === 'I am innocent')));
    const interrupt = await listener?.request('chat:send', { channel: 'main', text: 'liar' });
    expect(interrupt).toMatchObject({ ok: false, error: { code: 'NOT_YOUR_TURN' } });

    // Reconnect catch-up includes the chat this player may read.
    const sync = await others[0]?.call<{ chat: { text: string }[] }>('game:sync', {
      gameId,
      lastSeq: 0,
    });
    expect(sync?.chat.map((m) => m.text)).toEqual(['I am innocent']);
    for (const x of clients) x.close();
  });
});
