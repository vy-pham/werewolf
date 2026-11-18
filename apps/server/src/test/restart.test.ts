import type { GameSyncResult } from '@werewolf/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  FakeClock,
  setupLobby,
  startMongo,
  startServer,
  stopMongo,
  TestClient,
  until,
} from './helpers';

let dbUri: string;

beforeAll(async () => {
  dbUri = await startMongo();
});

afterAll(async () => {
  await stopMongo();
});

describe('server restart in the middle of a game (NFR-05) and reconnect (FR-GAME-10)', () => {
  it('recovers the phase timer and lets players catch up and continue', async () => {
    const clock = new FakeClock();
    const first = await startServer(dbUri, clock);
    const { clients, host, code } = await setupLobby(first, 6);
    const { gameId } = await host.call<{ gameId: string }>('game:start', {});
    await first.scheduler.fire(gameId); // → NIGHT step 1
    await until(() => clients.every((c) => c.view?.phase.name === 'NIGHT'));

    const wolf = clients.find((c) => c.view?.me?.role === 'werewolf') as TestClient;
    const prey = clients.find((c) => c.view?.me?.role !== 'werewolf') as TestClient;
    await wolf.call('game:action', { gameId, command: { type: 'WOLF_VOTE', targetId: prey.id } });
    const timerBefore = first.scheduler.entries.get(gameId);

    // ── Crash/restart ──
    for (const c of clients) c.close();
    await first.close();
    const second = await startServer(dbUri, clock);
    expect(second.scheduler.entries.get(gameId)).toEqual(timerBefore);

    // ── Reconnect: re-join the room and sync ──
    const back = new TestClient(second.url, wolf.auth);
    await back.connected();
    await back.call('room:join', { code });
    const sync = await back.call<GameSyncResult>('game:sync', { gameId, lastSeq: 0 });
    expect(sync.view.phase).toMatchObject({ name: 'NIGHT', step: 1 });
    expect(sync.view.wolfVotes?.[wolf.id]).toBe(prey.id);
    expect(sync.events.filter((e) => e.type === 'ROLE_ASSIGNED')).toHaveLength(1);
    expect(sync.events.every((e, i, all) => i === 0 || e.seq > (all[i - 1]?.seq ?? 0))).toBe(true);

    // Catch-up only returns newer events.
    const lastSeq = sync.events.at(-1)?.seq ?? 0;
    const again = await back.call<GameSyncResult>('game:sync', { gameId, lastSeq });
    expect(again.events).toEqual([]);

    // The recovered timer still drives the game. The 6-player preset has no witch, so the night
    // resolves straight to DAWN and the wolf vote cast before the restart is applied.
    await second.scheduler.fire(gameId);
    await until(() => back.view?.phase.name === 'DAWN');
    expect(back.view?.players.find((p) => p.id === prey.id)?.alive).toBe(false);
    back.close();
    await second.close();
    expect(host.id).toBeTruthy();
  });
});
