import type {
  DeathCause,
  GameCommand,
  GameEvent,
  PhaseName,
  PhaseTimers,
  RoleCounts,
  RoleId,
  RoomRules,
  RuleError,
  SeerResult,
  Team,
} from '@werewolf/shared';
import type { Rng } from './rng';

export interface PlayerState {
  id: string;
  seat: number;
  role: RoleId;
  alive: boolean;
  death: { round: number; cause: DeathCause } | null;
}

/** Choices made during the current night. Reset when a new night starts. */
export interface NightState {
  /** Non-wolf actors who already acted this night (guard, seer, witch). */
  submitted: string[];
  /** wolfId → target (null = skip). A key exists once that wolf has voted. */
  wolfVotes: Record<string, string | null>;
  guardTargetId: string | null;
  seerTargetId: string | null;
  /** Resolved at the end of step 1 (before guard / witch are applied). */
  wolfTargetId: string | null;
  witchHeal: boolean;
  witchPoisonId: string | null;
  /** The alpha wolf chose to infect tonight's victim instead of killing. */
  alphaInfect: boolean;
  /** Set at the end of step 1 when the infection happens: the witch sees no victim. */
  infectTargetId: string | null;
}

export interface DayState {
  /** DISCUSSION speaking order (living players, seat order, rotated by round). */
  speakerOrder: string[];
  /** voterId → target (null = skip). Players who never voted abstain. */
  votes: Record<string, string | null>;
  /** Only these players can be voted for during a revote. */
  candidates: string[] | null;
  accusedId: string | null;
}

/**
 * Full authoritative game state. Plain JSON (no classes, no undefined) so the server can store it
 * in MongoDB as-is. Never send it to clients — use `projectFor`.
 */
export interface GameState {
  rules: RoomRules;
  timers: PhaseTimers;
  roleCounts: RoleCounts;
  /** Night N and the day after it share round N. 0 before the first night. */
  round: number;
  phase: { name: PhaseName; step: number; endsAt: number; revote: number };
  players: PlayerState[];
  memory: {
    guardLastTargetId: string | null;
    witchHealUsed: boolean;
    witchPoisonUsed: boolean;
    seerResults: SeerResult[];
    /** Cupid's couple (night 1). */
    lovers: [string, string] | null;
    /** The fool after their first execution: alive, but can no longer vote. */
    foolRevealedId: string | null;
    /** Wolf bites the elder survived (the first one is survived). */
    elderHits: number;
    /** The alpha wolf's one infection per game. */
    infection: { targetId: string; originalRole: RoleId } | null;
  };
  night: NightState;
  day: DayState;
  hunter: { pendingId: string | null; next: 'DISCUSSION' | 'NIGHT' };
  winner: Team | null;
}

export interface EngineContext {
  /** Current time in ms (Date.now()). */
  now: number;
  rng: Rng;
}

export type EngineInput =
  | { kind: 'command'; actorId: string; command: GameCommand }
  /** Sent by the server's PhaseScheduler once `phase.endsAt` has passed. */
  | { kind: 'timeout' };

export type EngineResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; error: RuleError };

/** Mutable working copy used while processing one input. */
export interface Tx {
  s: GameState;
  ctx: EngineContext;
  events: GameEvent[];
}
