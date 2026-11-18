import type { GameCommand, PlayerView, RoomView } from '@werewolf/shared';
import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Game, GameEventLog } from '../modules/games/game.model';
import { User } from '../modules/users/user.model';
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

/** A simple bot: wolves always bite the first non-wolf; everybody else skips. */
function chooseCommand(view: PlayerView): GameCommand | null {
  const me = view.me;
  if (!me?.pendingAction || me.submitted) return null;
  switch (me.pendingAction) {
    case 'WOLF_VOTE': {
      const prey = view.players.find((p) => p.alive && p.role !== 'werewolf');
      return { type: 'WOLF_VOTE', targetId: prey?.id ?? null };
    }
    case 'WITCH_ACT':
      return { type: 'WITCH_ACT', heal: false, poisonTargetId: null };
    case 'END_TURN':
      return { type: 'END_TURN' };
    case 'GUARD_PROTECT':
    case 'SEER_CHECK':
    case 'DAY_VOTE':
    case 'HUNTER_SHOOT':
      return { type: me.pendingAction, targetId: null };
  }
}

async function playToTheEnd(clients: TestClient[], gameId: string) {
  for (let step = 0; step < 400; step++) {
    await settle();
    if (clients.some((c) => c.view?.phase.name === 'GAME_OVER')) return;
    let acted = false;
    for (const c of clients) {
      const command = c.view ? chooseCommand(c.view) : null;
      if (!command) continue;
      const res = await c.request('game:action', { gameId, command });
      if (res.ok) acted = true;
    }
    if (!acted && server.scheduler.entries.has(gameId)) await server.scheduler.fire(gameId);
  }
  throw new Error('game did not finish');
}

/** The view invariant: a player only ever sees their own role, wolf teammates, or all at the end. */
function assertNoLeak(client: TestClient) {
  for (const view of client.views) {
    const me = view.me;
    for (const p of view.players) {
      if (p.role === null || view.phase.name === 'GAME_OVER' || p.id === client.id) continue;
      expect(me?.role === 'werewolf' && p.role === 'werewolf', `${client.id} saw ${p.id}`).toBe(
        true,
      );
    }
    if (me?.role !== 'werewolf') expect(view.wolfVotes).toBeNull();
  }
}

describe('a full game over Socket.IO', () => {
  it('plays from lobby to GAME_OVER, without leaks, and returns everyone to the lobby', async () => {
    const { clients, host } = await setupLobby(server, 6);
    const { gameId } = await host.call<{ gameId: string }>('game:start', {});
    await until(() => clients.every((c) => c.gameId === gameId && c.view !== null));

    // Each player received exactly one private role assignment.
    for (const c of clients) {
      const assigned = c.events.filter((e) => e.type === 'ROLE_ASSIGNED');
      expect(assigned).toHaveLength(1);
      expect(c.view?.me?.role).toBeTruthy();
    }
    const wolves = clients.filter((c) => c.view?.me?.role === 'werewolf');
    expect(wolves).toHaveLength(2);

    // Wrong actions are rejected with the engine's error codes.
    const villager = clients.find((c) => c.view?.me?.role !== 'werewolf');
    const rejected = await villager?.request('game:action', {
      gameId,
      command: { type: 'WOLF_VOTE', targetId: villager.id },
    });
    expect(rejected).toMatchObject({ ok: false, error: { code: 'NOT_YOUR_TURN' } });

    await playToTheEnd(clients, gameId);
    await until(() => clients.every((c) => c.view?.phase.name === 'GAME_OVER'));

    const final = clients[0]?.view;
    expect(final?.winner).toBe('wolves');
    expect(final?.players.every((p) => p.role !== null)).toBe(true);
    for (const c of clients) assertNoLeak(c);

    // Persistence: finished game, full event log, stats, room back in the lobby.
    const game = await Game.findById(gameId).lean();
    expect(game).toMatchObject({ status: 'finished', winner: 'wolves' });
    expect(await GameEventLog.countDocuments({ gameId })).toBe(game?.eventSeq);
    const users = await User.find({ _id: { $in: clients.map((c) => c.id) } }).lean();
    expect(users.every((u) => u.stats?.games === 1)).toBe(true);
    expect(users.filter((u) => u.stats?.wins === 1)).toHaveLength(2);

    await until(() => host.room?.status === 'lobby');
    const room = host.room as RoomView;
    expect(room.currentGameId).toBeNull();
    expect(room.members.every((m) => !m.ready)).toBe(true);
    expect(server.scheduler.entries.has(gameId)).toBe(false);
    for (const c of clients) c.close();
  });

  it('rejects actions from users who are not in the game', async () => {
    const { clients, host } = await setupLobby(server, 6);
    const { gameId } = await host.call<{ gameId: string }>('game:start', {});
    const other = await setupLobby(server, 1);
    const res = await other.host.request('game:action', {
      gameId,
      command: { type: 'END_TURN' },
    });
    expect(res).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    const sync = await other.host.request('game:sync', { gameId, lastSeq: 0 });
    expect(sync).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    for (const c of [...clients, ...other.clients]) c.close();
    expect(mongoose.connection.readyState).toBe(1);
  });
});
