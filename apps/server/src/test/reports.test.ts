import type { ReportableGame, ReportView, UserStats } from '@werewolf/shared';
import { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Transcript } from '../modules/captions/transcript.model';
import { ChatMessage } from '../modules/chat/chat-message.model';
import { Game } from '../modules/games/game.model';
import { Report, type ReportDoc } from '../modules/reports/report.model';
import { User } from '../modules/users/user.model';
import { guest, http, startMongo, startServer, stopMongo, type TestServer } from './helpers';

let server: TestServer;

beforeAll(async () => {
  server = await startServer(await startMongo());
});

afterAll(async () => {
  await server.close();
  await stopMongo();
});

/** Three guests and a game between them that ended `endedAgoMs` ago, with some chat. */
async function finishedGame(endedAgoMs = 60_000) {
  const [a, b, c] = await Promise.all(['Alice', 'Bob', 'Carol'].map((n) => guest(server.url, n)));
  if (!a || !b || !c) throw new Error('guests');
  const roomId = new Types.ObjectId();
  const game = await Game.create({
    roomId,
    status: 'finished',
    seed: 1,
    state: {},
    players: [a, b, c].map((x, i) => ({
      userId: x.user.id,
      displayName: x.user.displayName,
      seat: i + 1,
    })),
    winner: 'village',
    endedAt: new Date(server.clock.now() - endedAgoMs),
  });
  const at = new Date(server.clock.now() - endedAgoMs - 1000);
  await ChatMessage.create([
    {
      roomId,
      gameId: game._id,
      channel: 'main',
      senderId: b.user.id,
      senderName: 'Bob',
      text: 'rude words',
      at,
    },
    {
      roomId,
      gameId: game._id,
      channel: 'main',
      senderId: c.user.id,
      senderName: 'Carol',
      text: 'hello',
      at,
    },
  ]);
  await Transcript.create({
    roomId,
    gameId: game._id,
    channel: 'main',
    speakerId: b.user.id,
    lang: 'en',
    text: 'spoken rude words',
    at,
  });
  return { a, b, c, gameId: String(game._id) };
}

const report = (token: string, body: Record<string, unknown>) =>
  http<ReportView>(server.url, 'POST', '/reports', body, token);

describe('reports', () => {
  it('a player reports another; the evidence copies only that player’s lines', async () => {
    const { a, b, gameId } = await finishedGame();
    const res = await report(a.accessToken, {
      gameId,
      reportedId: b.user.id,
      reason: 'abuse',
      note: 'insults',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      gameId,
      reportedId: b.user.id,
      reason: 'abuse',
      status: 'open',
    });

    const saved = await Report.findById(res.body.id).lean<ReportDoc>();
    expect(saved?.evidence.messages.map((m) => m.text)).toEqual(['rude words']);
    expect(saved?.evidence.transcripts.map((t) => t.text)).toEqual(['spoken rude words']);
    expect(saved?.note).toBe('insults');

    // The evidence survives the 24 h TTL of chat: it is a copy.
    await ChatMessage.deleteMany({ gameId });
    expect((await Report.findById(res.body.id).lean<ReportDoc>())?.evidence.messages).toHaveLength(
      1,
    );

    const again = await report(a.accessToken, { gameId, reportedId: b.user.id, reason: 'spam' });
    expect(again.status).toBe(409);
  });

  it('lists reportable games with who was already reported', async () => {
    const { a, b, c, gameId } = await finishedGame();
    await report(a.accessToken, { gameId, reportedId: c.user.id, reason: 'afk' });
    const res = await http<ReportableGame[]>(
      server.url,
      'GET',
      '/reports/reportable',
      undefined,
      a.accessToken,
    );
    const game = res.body.find((g) => g.gameId === gameId);
    expect(game?.players.map((p) => p.userId).sort()).toEqual([b.user.id, c.user.id].sort());
    expect(game?.reportedIds).toEqual([c.user.id]);
    expect(game?.reportableUntil).toBe((game?.endedAt ?? 0) + 24 * 3600 * 1000);
  });

  it('rejects self-reports, outsiders and reports after 24 h', async () => {
    const { a, b, gameId } = await finishedGame();
    expect(
      (await report(a.accessToken, { gameId, reportedId: a.user.id, reason: 'other' })).status,
    ).toBe(400);
    const outsider = await guest(server.url, 'Mallory');
    expect(
      (await report(outsider.accessToken, { gameId, reportedId: b.user.id, reason: 'other' }))
        .status,
    ).toBe(404);

    const old = await finishedGame(24 * 3600 * 1000 + 1);
    const late = await report(old.a.accessToken, {
      gameId: old.gameId,
      reportedId: old.b.user.id,
      reason: 'abuse',
    });
    expect(late.status).toBe(410);
    expect(late.body).toMatchObject({ code: 'REPORT_WINDOW_CLOSED' });
  });
});

describe('stats', () => {
  it('returns games and wins by role', async () => {
    const user = await guest(server.url, 'Stat');
    const empty = await http<UserStats>(
      server.url,
      'GET',
      `/users/${user.user.id}/stats`,
      undefined,
      user.accessToken,
    );
    expect(empty.body).toEqual({ games: 0, wins: 0, byRole: {} });

    await User.updateOne(
      { _id: user.user.id },
      { $set: { stats: { games: 3, wins: 2, byRole: { cupid: { games: 1, wins: 1 } } } } },
    );
    const res = await http<UserStats>(
      server.url,
      'GET',
      `/users/${user.user.id}/stats`,
      undefined,
      user.accessToken,
    );
    expect(res.body).toEqual({ games: 3, wins: 2, byRole: { cupid: { games: 1, wins: 1 } } });
    expect(
      (await http(server.url, 'GET', '/users/nope/stats', undefined, user.accessToken)).status,
    ).toBe(404);
  });
});
