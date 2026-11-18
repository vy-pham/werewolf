import { canSend } from '@werewolf/game-engine';
import type { Channel, ChatMessageView } from '@werewolf/shared';
import type { Clock } from '../../lib/clock';
import { AppError } from '../../lib/errors';
import type { IO } from '../../plugins/socket';
import { channelReaders } from '../games/delivery';
import type { GameDoc } from '../games/game.model';
import type { GamesService } from '../games/games.service';
import type { RoomsService } from '../rooms/rooms.service';
import { roomChannel, userChannel } from '../rooms/rooms.service';
import { ChatMessage, type ChatMessageDoc } from './chat-message.model';

const RATE_WINDOW_MS = 5000;
const RATE_MAX = 5; // FR-CHAT-02: 5 messages / 5 s

const toView = (m: ChatMessageDoc): ChatMessageView => ({
  id: String(m._id),
  channel: m.channel,
  senderId: String(m.senderId),
  senderName: m.senderName,
  text: m.text,
  at: m.at.getTime(),
});

/**
 * Text chat. In the lobby everyone in the room talks on `lobby`. During a game, sending follows
 * the engine's turn-based speech rules (`canSend`), exactly like voice.
 */
export class ChatService {
  private readonly recent = new Map<string, number[]>();
  private games: GamesService | null = null;

  constructor(
    private readonly io: IO,
    private readonly clock: Clock,
    private readonly rooms: RoomsService,
  ) {}

  setGames(games: GamesService) {
    this.games = games;
  }

  async send(
    sender: { userId: string; displayName: string; roomId: string | null },
    channel: Channel,
    text: string,
  ): Promise<void> {
    if (!sender.roomId) throw new AppError('CONFLICT', 'Join a room first');
    this.rateLimit(sender.userId);
    const room = await this.rooms.getById(sender.roomId);
    if (!room.members.some((m) => String(m.userId) === sender.userId)) {
      throw new AppError('FORBIDDEN', 'You are not in this room');
    }

    const at = new Date(this.clock.now());
    if (room.status !== 'in_game' || !room.currentGameId) {
      if (channel !== 'lobby') throw new AppError('FORBIDDEN', 'Only the lobby channel is open');
      const msg = await this.save(room._id, null, channel, sender, text, at);
      this.io.to(roomChannel(String(room._id))).emit('chat:message', toView(msg));
      return;
    }

    if (!this.games) throw new AppError('INTERNAL', 'Game module not wired');
    const game = await this.games.load(String(room.currentGameId));
    if (channel === 'lobby' || !canSend(game.state, sender.userId, channel)) {
      throw new AppError('NOT_YOUR_TURN', 'You cannot speak on this channel right now');
    }
    const msg = await this.save(room._id, game._id, channel, sender, text, at);
    const view = toView(msg);
    for (const userId of channelReaders(channel, game.state)) {
      this.io.to(userChannel(userId)).emit('chat:message', view);
    }
  }

  /** Last messages of a game that `userId` may read (reconnect). */
  async recentForGame(game: GameDoc, userId: string): Promise<ChatMessageView[]> {
    const messages = await ChatMessage.find({ gameId: game._id })
      .sort({ at: -1 })
      .limit(100)
      .lean<ChatMessageDoc[]>();
    return messages
      .filter((m) => channelReaders(m.channel, game.state).includes(userId))
      .reverse()
      .map(toView);
  }

  private rateLimit(userId: string) {
    const now = this.clock.now();
    const sent = (this.recent.get(userId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
    if (sent.length >= RATE_MAX) throw new AppError('RATE_LIMITED', 'Slow down');
    sent.push(now);
    this.recent.set(userId, sent);
  }

  private async save(
    roomId: ChatMessageDoc['roomId'],
    gameId: ChatMessageDoc['gameId'],
    channel: Channel,
    sender: { userId: string; displayName: string },
    text: string,
    at: Date,
  ) {
    const doc = await ChatMessage.create({
      roomId,
      gameId,
      channel,
      senderId: sender.userId,
      senderName: sender.displayName,
      text,
      at,
    });
    return doc.toObject() as ChatMessageDoc;
  }
}
