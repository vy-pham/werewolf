import { z } from 'zod';
import type { ErrorCode } from './errors';
import type { Channel, PhaseName } from './phases';
import type { RoleId, Team } from './roles';

const playerId = z.string().min(1);

/**
 * Commands a player can send during a game (`game:action`). `targetId: null` means "skip".
 * The engine decides whether the sender may use the command right now.
 */
export const GameCommandSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('WOLF_VOTE'),
    targetId: playerId.nullable(),
    /** Alpha wolf only, once per game: turn tonight's victim into a wolf instead of killing. */
    infect: z.boolean().optional(),
  }),
  z.object({ type: z.literal('GUARD_PROTECT'), targetId: playerId.nullable() }),
  z.object({ type: z.literal('SEER_CHECK'), targetId: playerId.nullable() }),
  z.object({
    type: z.literal('WITCH_ACT'),
    heal: z.boolean(),
    poisonTargetId: playerId.nullable(),
  }),
  z.object({ type: z.literal('DAY_VOTE'), targetId: playerId.nullable() }),
  z.object({ type: z.literal('HUNTER_SHOOT'), targetId: playerId.nullable() }),
  /** Cupid, night 1: link two living players (may include Cupid). `null` = no couple. */
  z.object({
    type: z.literal('CUPID_LINK'),
    targetIds: z.tuple([playerId, playerId]).nullable(),
  }),
  /** The current speaker finishes their DISCUSSION turn early. */
  z.object({ type: z.literal('END_TURN') }),
]);
export type GameCommand = z.infer<typeof GameCommandSchema>;
export type GameCommandType = GameCommand['type'];

/** `heartbreak`: a lover died, so the other lover dies too. */
export type DeathCause = 'wolves' | 'poison' | 'execution' | 'hunter' | 'heartbreak';

export interface SeerResult {
  round: number;
  targetId: string;
  isWolf: boolean;
}

/** Who may receive an event. The server routes events by this field — never broadcast blindly. */
export type EventAudience =
  | { kind: 'all' }
  | { kind: 'wolves' }
  | { kind: 'player'; playerId: string }
  | { kind: 'dead' };

export interface GameEventPayloads {
  GAME_STARTED: { playerIds: string[] };
  /** `wolfTeam` lists every wolf for wolves, and is empty for everyone else. */
  ROLE_ASSIGNED: { role: RoleId; wolfTeam: string[] };
  PHASE_CHANGED: { name: PhaseName; step: number; round: number; endsAt: number; revote: number };
  /** A new DISCUSSION speaking turn started. `turn` is 1-based. */
  SPEAKER_CHANGED: { speakerId: string; turn: number; total: number; endsAt: number };
  WOLF_VOTE_CAST: { wolfId: string; targetId: string | null };
  NIGHT_ACTION_ACCEPTED: { type: GameCommandType };
  SEER_RESULT: SeerResult;
  /** Sent to the witch at the start of night step 2: who the wolves attacked (before guard). */
  WITCH_INFO: { victimId: string | null };
  /** `role` is only filled when the room reveals roles on death. */
  PLAYER_DIED: { playerId: string; role: RoleId | null };
  NO_DEATHS: Record<string, never>;
  VOTE_CAST: { voterId: string; targetId: string | null };
  VOTE_RESULT: {
    tally: Record<string, number>;
    skips: number;
    executedId: string | null;
    tie: string[];
    revote: boolean;
  };
  HUNTER_SHOT: { hunterId: string; targetId: string | null };
  /** To Cupid: the couple was linked. */
  CUPID_LINKED: { loverIds: [string, string] };
  /** To each lover: who their partner is (and the partner's role). */
  LOVER_ASSIGNED: { partnerId: string; partnerRole: RoleId };
  /** To the infected player: they are now a werewolf (with the current pack). */
  INFECTED: { wolfTeam: string[] };
  /** To the wolves: the alpha's infection worked. */
  WOLF_JOINED: { playerId: string };
  /** To everyone: the executed player was the fool; they survive but can no longer vote. */
  FOOL_REVEALED: { playerId: string };
  /** To the elder only: they survived the wolves' bite (once per game). */
  ELDER_SURVIVED: Record<string, never>;
  GAME_OVER: {
    winner: Team;
    roles: Record<string, RoleId>;
    /** The Cupid couple, if any. */
    lovers: [string, string] | null;
  };
}
export type GameEventType = keyof GameEventPayloads;
export type GameEvent = {
  [K in GameEventType]: { type: K; audience: EventAudience; payload: GameEventPayloads[K] };
}[GameEventType];

export interface RuleError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export interface PublicPlayer {
  id: string;
  seat: number;
  alive: boolean;
  /** Null unless the viewer is allowed to know it. */
  role: RoleId | null;
}

/** Everything one viewer may know about a game. Produced only by `projectFor` in the engine. */
export interface PlayerView {
  round: number;
  phase: { name: PhaseName; step: number; endsAt: number; revote: number };
  players: PublicPlayer[];
  me: {
    id: string;
    role: RoleId;
    team: Team;
    alive: boolean;
    /** The command this player is expected to send now, if any. */
    pendingAction: GameCommandType | null;
    submitted: boolean;
    seerResults?: SeerResult[];
    guardLastTargetId?: string | null;
    witch?: { healUsed: boolean; poisonUsed: boolean; victimId: string | null };
    /** Lovers: their partner (whose role they can see). */
    partnerId?: string | null;
    /** Cupid: the couple they linked. */
    cupidLinked?: [string, string] | null;
    /** Alpha wolf: infection used already / chosen for tonight. */
    alpha?: { infectUsed: boolean; infectTonight: boolean };
    /** A revealed fool can no longer vote. */
    canVote?: boolean;
  } | null;
  /** Only for wolves during the night. */
  wolfVotes: Record<string, string | null> | null;
  /** Public during VOTE. */
  dayVotes: Record<string, string | null> | null;
  /** Restricted candidates during a revote. */
  candidates: string[] | null;
  /** The player on trial during DEFENSE / EXECUTION. */
  accusedId: string | null;
  /** The hunter who is choosing a target during HUNTER_SHOT. */
  hunterId: string | null;
  /** DISCUSSION: speaking order for today and the player who holds the floor now. */
  speakerOrder: string[] | null;
  speakerId: string | null;
  winner: Team | null;
  /** The Cupid couple, revealed to everyone at GAME_OVER. */
  lovers: [string, string] | null;
  /** What this viewer may do on each channel right now (voice + text chat). UI hint; the server enforces it. */
  channels: VoiceGrant;
}

export interface ChannelGrant {
  publish: boolean;
  subscribe: boolean;
}
/**
 * Voice / text chat / caption access per channel. A missing channel means "not connected".
 * `publish` = may speak (voice) and send messages (chat) on that channel.
 */
export type VoiceGrant = Partial<Record<Exclude<Channel, 'lobby'>, ChannelGrant>>;
