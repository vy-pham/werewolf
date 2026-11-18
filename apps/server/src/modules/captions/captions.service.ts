import { voicePermissions } from '@werewolf/game-engine';
import {
  CAPTION_LANGS,
  type CaptionIngestResult,
  type CaptionIngestSchema,
  type CaptionLang,
  type CaptionRoomsResult,
  type CaptionView,
  type Channel,
} from '@werewolf/shared';
import { Types } from 'mongoose';
import type { z } from 'zod';
import type { Clock } from '../../lib/clock';
import type { Presence } from '../../lib/presence';
import type { IO } from '../../plugins/socket';
import type { GameDoc } from '../games/game.model';
import type { GamesService } from '../games/games.service';
import { Room, type RoomDoc } from '../rooms/room.model';
import { type RoomsService, userChannel } from '../rooms/rooms.service';
import { User } from '../users/user.model';
import type { VoiceProvider } from '../voice/voice.provider';
import { eligibleChannels, gameVoiceRoom, lobbyVoiceRoom } from '../voice/voice.service';
import { Transcript } from './transcript.model';

/** LiveKit identity of the captions worker in every room it listens to. */
export const CAPTIONS_IDENTITY = 'captions-bot';
/** Upper bound of rooms returned per poll (one worker instance; shard workers beyond this). */
const MAX_ROOMS = 200;
const GAME_CHANNELS = ['main', 'wolves', 'dead'] as const satisfies readonly Channel[];

type Ingest = z.output<typeof CaptionIngestSchema>;
type GameChannel = Exclude<Channel, 'lobby'>;
type Target =
  | { kind: 'lobby'; roomId: string }
  | { kind: 'game'; gameId: string; channel: GameChannel };

/** Parses the LiveKit room names built by `lobbyVoiceRoom` / `gameVoiceRoom`. */
export function parseVoiceRoom(name: string): Target | null {
  const lobby = /^room-([0-9a-f]{24})-lobby$/.exec(name);
  if (lobby?.[1]) return { kind: 'lobby', roomId: lobby[1] };
  const game = /^game-([0-9a-f]{24})-([a-z]+)$/.exec(name);
  const channel = game?.[2];
  if (game?.[1] && (GAME_CHANNELS as readonly string[]).includes(channel ?? '')) {
    return { kind: 'game', gameId: game[1], channel: channel as GameChannel };
  }
  return null;
}

const NOTHING: CaptionIngestResult = { delivered: 0, wanted: [] };

/**
 * Captions (docs/03-technical-design.md §7). The worker only transcribes; this service decides
 * who may read each sentence, with the same rules as voice: a caption goes only to players who
 * may *hear* that channel right now (`voicePermissions(...).subscribe`). Wolves' captions never
 * reach a non-wolf, and nobody gets captions of a channel they cannot listen to.
 */
export class CaptionsService {
  private games: GamesService | null = null;

  constructor(
    private readonly io: IO,
    private readonly clock: Clock,
    private readonly rooms: RoomsService,
    private readonly presence: Presence,
    private readonly voice: VoiceProvider,
  ) {}

  setGames(games: GamesService) {
    this.games = games;
  }

  /** Voice rooms the worker should be in: rooms with voice + captions on and someone online. */
  async activeRooms(): Promise<CaptionRoomsResult> {
    const rooms = await Room.find({
      'settings.captions': true,
      'settings.voice': true,
      status: { $in: ['lobby', 'in_game'] },
    })
      .select({ status: 1, members: 1, currentGameId: 1 })
      .sort({ updatedAt: -1 })
      .limit(MAX_ROOMS)
      .lean<Pick<RoomDoc, '_id' | 'status' | 'members' | 'currentGameId'>[]>();

    const names: string[] = [];
    for (const room of rooms) {
      if (!room.members.some((m) => this.presence.isOnline(String(m.userId)))) continue;
      if (room.status === 'lobby') names.push(lobbyVoiceRoom(String(room._id)));
      else if (room.currentGameId) {
        for (const channel of GAME_CHANNELS) {
          names.push(gameVoiceRoom(String(room.currentGameId), channel));
        }
      }
    }
    return {
      url: this.voice.url,
      rooms: await Promise.all(
        names.map(async (room) => ({
          room,
          token: await this.voice.createListenerToken({ room, identity: CAPTIONS_IDENTITY }),
        })),
      ),
    };
  }

  /** One transcribed sentence from the worker → readers of that channel, in their language. */
  async ingest(input: Ingest): Promise<CaptionIngestResult> {
    const target = parseVoiceRoom(input.room);
    if (!target || !Types.ObjectId.isValid(input.speakerId)) return NOTHING;

    let room: RoomDoc;
    let game: GameDoc | null = null;
    let channel: Channel;
    let listeners: string[];
    if (target.kind === 'lobby') {
      room = await this.rooms.getById(target.roomId);
      channel = 'lobby';
      if (room.status !== 'lobby') return NOTHING;
      if (!room.members.some((m) => String(m.userId) === input.speakerId)) return NOTHING;
      listeners = room.members.map((m) => String(m.userId));
    } else {
      if (!this.games) return NOTHING;
      game = await this.games.load(target.gameId);
      room = await this.rooms.getById(String(game.roomId));
      channel = target.channel;
      if (game.status !== 'running') return NOTHING;
      const state = game.state;
      if (!eligibleChannels(state, input.speakerId).includes(channel)) return NOTHING;
      listeners = state.players
        .filter((p) => voicePermissions(state, p.id)[target.channel]?.subscribe)
        .map((p) => p.id);
    }
    if (!room.settings.captions || !room.settings.voice) return NOTHING;

    const at = new Date(this.clock.now());
    const saved = await Transcript.create({
      roomId: room._id,
      gameId: game?._id ?? null,
      channel,
      speakerId: input.speakerId,
      lang: input.lang,
      text: input.text,
      at,
    });
    if (listeners.length === 0) return NOTHING;

    const speakerName =
      room.members.find((m) => String(m.userId) === input.speakerId)?.displayName ?? '?';
    const prefs = await User.find({ _id: { $in: listeners } })
      .select({ locale: 1, captionLangs: 1 })
      .lean<{ _id: Types.ObjectId; locale?: string; captionLangs?: string[] }[]>();
    const langOf = new Map(prefs.map((u) => [String(u._id), captionLangOf(u)]));

    const wanted = new Set<CaptionLang>();
    for (const userId of listeners) {
      const lang = langOf.get(userId) ?? 'en';
      wanted.add(lang);
      const translated = lang === input.lang ? undefined : input.translations[lang];
      const view: CaptionView = {
        id: String(saved._id),
        channel,
        speakerId: input.speakerId,
        speakerName,
        text: translated ?? input.text,
        lang: translated === undefined ? input.lang : lang,
        original: input.text,
        sourceLang: input.lang,
        at: at.getTime(),
      };
      this.io.to(userChannel(userId)).emit('caption:message', view);
    }
    return { delivered: listeners.length, wanted: [...wanted] };
  }
}

/** The language a user reads captions in: their caption preference, else their UI language. */
function captionLangOf(u: { locale?: string; captionLangs?: string[] }): CaptionLang {
  const supported = (l: string | undefined): l is CaptionLang =>
    l !== undefined && (CAPTION_LANGS as readonly string[]).includes(l);
  const first = u.captionLangs?.[0];
  if (supported(first)) return first;
  return supported(u.locale) ? u.locale : 'en';
}
