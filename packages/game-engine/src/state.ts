import {
  type EventAudience,
  type GameEventPayloads,
  type GameEventType,
  ROLE_TEAM,
  type RoleId,
  type RuleError,
  type Team,
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
  alphaInfect: false,
  infectTargetId: null,
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

/** The other half of a Cupid couple. */
export function partnerOf(s: GameState, id: string): PlayerState | undefined {
  const lovers = s.memory.lovers;
  if (!lovers?.includes(id)) return undefined;
  return findPlayer(s, lovers[0] === id ? lovers[1] : lovers[0]);
}

/** A couple from different teams (one wolf, one not) plays for itself: team `lovers`. */
export function mixedCouple(s: GameState): [PlayerState, PlayerState] | null {
  const [a, b] = (s.memory.lovers ?? []).map((id) => findPlayer(s, id));
  return a && b && isWolf(a) !== isWolf(b) ? [a, b] : null;
}

/** The team a player currently plays for. */
export function teamOf(s: GameState, p: PlayerState): Team {
  const couple = mixedCouple(s);
  if (couple?.some((x) => x.id === p.id)) return 'lovers';
  return ROLE_TEAM[p.role];
}

/** The role a player was dealt (the alpha's infection turns a player into a werewolf). */
export const startingRole = (s: GameState, p: PlayerState): RoleId =>
  s.memory.infection?.targetId === p.id ? s.memory.infection.originalRole : p.role;

/** Living players may vote, except a revealed fool. */
export const canVote = (s: GameState, p: PlayerState) =>
  p.alive && s.memory.foolRevealedId !== p.id;

/**
 * Fills fields added after a game was created (states stored by an older server version), so a
 * deploy does not break running games.
 */
export function normalize(s: GameState): GameState {
  s.memory.lovers ??= null;
  s.memory.foolRevealedId ??= null;
  s.memory.elderHits ??= 0;
  s.memory.infection ??= null;
  s.night.alphaInfect ??= false;
  s.night.infectTargetId ??= null;
  return s;
}

/** Wolves have no kill on night 1 when `noKillFirstNight` is on. */
export const wolvesMayKill = (s: GameState) => !(s.rules.noKillFirstNight && s.round === 1);

export const hasKey = (record: Record<string, unknown>, key: string) => Object.hasOwn(record, key);

/** Deep copy of plain JSON data (game state is JSON by design). Works on every JS runtime. */
export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
