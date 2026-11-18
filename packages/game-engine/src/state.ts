import {
  type EventAudience,
  type GameEventPayloads,
  type GameEventType,
  ROLE_TEAM,
  type RoleId,
  type RuleError,
} from '@werewolf/shared';
import type { DayState, GameState, NightState, PlayerState, Tx } from './types';

export const ALL: EventAudience = { kind: 'all' };
export const WOLVES: EventAudience = { kind: 'wolves' };
export const toPlayer = (playerId: string): EventAudience => ({ kind: 'player', playerId });

export function emit<K extends GameEventType>(
  tx: Tx,
  type: K,
  audience: EventAudience,
  payload: GameEventPayloads[K],
) {
  tx.events.push({ type, audience, payload } as Tx['events'][number]);
}

export const ruleError = (code: RuleError['code'], message: string): RuleError => ({
  code,
  message,
});

export const emptyNight = (): NightState => ({
  submitted: [],
  wolfVotes: {},
  guardTargetId: null,
  seerTargetId: null,
  wolfTargetId: null,
  witchHeal: false,
  witchPoisonId: null,
});

export const emptyDay = (): DayState => ({
  speakerOrder: [],
  votes: {},
  candidates: null,
  accusedId: null,
});

export const findPlayer = (s: GameState, id: string | null | undefined) =>
  id ? s.players.find((p) => p.id === id) : undefined;

export const isWolf = (p: PlayerState) => ROLE_TEAM[p.role] === 'wolves';

/** Holder of a unique role (guard, seer, witch, hunter). */
export const holderOf = (s: GameState, role: RoleId) => s.players.find((p) => p.role === role);

export const aliveWolves = (s: GameState) => s.players.filter((p) => p.alive && isWolf(p));

/** Wolves have no kill on night 1 when `noKillFirstNight` is on. */
export const wolvesMayKill = (s: GameState) => !(s.rules.noKillFirstNight && s.round === 1);

export const hasKey = (record: Record<string, unknown>, key: string) => Object.hasOwn(record, key);

/** Deep copy of plain JSON data (game state is JSON by design). Works on every JS runtime. */
export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
