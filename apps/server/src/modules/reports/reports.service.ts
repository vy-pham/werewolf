import {
  type CreateReportBody,
  REPORT_WINDOW_MS,
  type ReportableGame,
  type ReportView,
} from '@werewolf/shared';
import { Types } from 'mongoose';
import type { Clock } from '../../lib/clock';
import { AppError } from '../../lib/errors';
import { Transcript, type TranscriptDoc } from '../captions/transcript.model';
import { ChatMessage, type ChatMessageDoc } from '../chat/chat-message.model';
import { Game, type GameDoc } from '../games/game.model';
import { Report, type ReportDoc } from './report.model';

/** Evidence copied per report (the reported player's own lines only). */
const MAX_EVIDENCE = 200;
/** Abuse guard: reports one user may file per 24 h. */
const MAX_REPORTS_PER_DAY = 20;

const toView = (r: ReportDoc): ReportView => ({
  id: String(r._id),
  gameId: String(r.gameId),
  reportedId: String(r.reportedId),
  reason: r.reason,
  status: r.status,
  createdAt: r.createdAt.getTime(),
});

const isPlayer = (game: GameDoc, userId: string) =>
  game.players.some((p) => String(p.userId) === userId);

/**
 * Player reports (FR-MISC-02). A player may report another player of the same game until 24 h
 * after it ended; the server copies the reported player's chat and transcripts as evidence
 * (the originals expire after 24 h). Reviewing reports (admin tools) is Release 3.
 */
export class ReportsService {
  constructor(private readonly clock: Clock) {}

  async create(reporterId: string, body: CreateReportBody): Promise<ReportView> {
    if (!Types.ObjectId.isValid(body.gameId) || !Types.ObjectId.isValid(body.reportedId)) {
      throw new AppError('NOT_FOUND', 'Game or player not found');
    }
    const game = await Game.findById(body.gameId).lean<GameDoc>();
    if (!game || !isPlayer(game, reporterId)) throw new AppError('NOT_FOUND', 'Game not found');
    if (body.reportedId === reporterId) {
      throw new AppError('VALIDATION_FAILED', 'You cannot report yourself');
    }
    if (!isPlayer(game, body.reportedId)) {
      throw new AppError('NOT_FOUND', 'That player was not in this game');
    }
    if (game.status !== 'finished' || !game.endedAt) {
      throw new AppError('CONFLICT', 'Reports open when the game is over');
    }
    const now = this.clock.now();
    if (now - game.endedAt.getTime() > REPORT_WINDOW_MS) {
      throw new AppError('REPORT_WINDOW_CLOSED', 'Reports are accepted for 24 hours after a game');
    }
    const recent = await Report.countDocuments({
      reporterId,
      createdAt: { $gte: new Date(now - 24 * 3600 * 1000) },
    });
    if (recent >= MAX_REPORTS_PER_DAY) throw new AppError('RATE_LIMITED', 'Too many reports');

    const [messages, transcripts] = await Promise.all([
      ChatMessage.find({ gameId: game._id, senderId: body.reportedId })
        .sort({ at: 1 })
        .limit(MAX_EVIDENCE)
        .lean<ChatMessageDoc[]>(),
      Transcript.find({ gameId: game._id, speakerId: body.reportedId })
        .sort({ at: 1 })
        .limit(MAX_EVIDENCE)
        .lean<TranscriptDoc[]>(),
    ]);

    try {
      const report = await Report.create({
        reporterId,
        reportedId: body.reportedId,
        gameId: game._id,
        roomId: game.roomId,
        reason: body.reason,
        note: body.note ?? '',
        evidence: {
          messages: messages.map((m) => ({ channel: m.channel, text: m.text, at: m.at })),
          transcripts: transcripts.map((t) => ({
            channel: t.channel,
            text: t.text,
            lang: t.lang,
            at: t.at,
          })),
        },
      });
      return toView(report.toObject() as ReportDoc);
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new AppError('CONFLICT', 'You already reported this player for this game');
      }
      throw error;
    }
  }

  /** The user's games that ended less than 24 h ago (players can still be reported). */
  async reportable(userId: string): Promise<ReportableGame[]> {
    const now = this.clock.now();
    const games = await Game.find({
      'players.userId': new Types.ObjectId(userId),
      status: 'finished',
      endedAt: { $gte: new Date(now - REPORT_WINDOW_MS) },
    })
      .select({ players: 1, endedAt: 1 })
      .sort({ endedAt: -1 })
      .limit(20)
      .lean<Pick<GameDoc, '_id' | 'players' | 'endedAt'>[]>();
    const mine = await Report.find({ reporterId: userId, gameId: { $in: games.map((g) => g._id) } })
      .select({ gameId: 1, reportedId: 1 })
      .lean<Pick<ReportDoc, 'gameId' | 'reportedId'>[]>();

    return games.map((g) => {
      const endedAt = g.endedAt?.getTime() ?? now;
      return {
        gameId: String(g._id),
        endedAt,
        reportableUntil: endedAt + REPORT_WINDOW_MS,
        players: g.players
          .filter((p) => String(p.userId) !== userId)
          .map((p) => ({ userId: String(p.userId), displayName: p.displayName })),
        reportedIds: mine
          .filter((r) => String(r.gameId) === String(g._id))
          .map((r) => String(r.reportedId)),
      };
    });
  }
}
