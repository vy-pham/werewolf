import { ROLE_IDS, ROLE_TEAM, type RoomSettings } from '@werewolf/shared';
import { enterPhase } from './phases';
import { shuffle } from './rng';
import { validateRoleSet } from './role-set';
import { ALL, clone, emit, emptyDay, emptyNight, ruleError, toPlayer } from './state';
import type { EngineContext, EngineResult, GameState, Tx } from './types';

export interface CreateGameInput {
  players: { id: string; seat: number }[];
  settings: Pick<RoomSettings, 'roles' | 'rules' | 'timers'>;
}

/** Deals roles (seeded shuffle via ctx.rng) and starts ROLE_REVEAL. */
export function createGame(input: CreateGameInput, ctx: EngineContext): EngineResult {
  const { players, settings } = input;
  if (new Set(players.map((p) => p.id)).size !== players.length) {
    return { ok: false, error: ruleError('VALIDATION_FAILED', 'Duplicate player ids') };
  }
  const roleErrors = validateRoleSet(settings.roles, players.length);
  if (roleErrors.length > 0) {
    return {
      ok: false,
      error: { ...ruleError('INVALID_ROLE_SET', 'Invalid role set'), details: roleErrors },
    };
  }

  const deck = shuffle(
    ROLE_IDS.flatMap((id) => Array<typeof id>(settings.roles[id] ?? 0).fill(id)),
    ctx.rng,
  );
  const seated = [...players].sort((a, b) => a.seat - b.seat);

  const state: GameState = {
    rules: clone(settings.rules),
    timers: clone(settings.timers),
    roleCounts: clone(settings.roles),
    round: 0,
    phase: { name: 'LOBBY', step: 1, endsAt: ctx.now, revote: 0 },
    players: seated.map((p, i) => ({
      id: p.id,
      seat: p.seat,
      role: deck[i] ?? 'villager',
      alive: true,
      death: null,
    })),
    memory: {
      guardLastTargetId: null,
      witchHealUsed: false,
      witchPoisonUsed: false,
      seerResults: [],
    },
    night: emptyNight(),
    day: emptyDay(),
    hunter: { pendingId: null, next: 'DISCUSSION' },
    winner: null,
  };

  const tx: Tx = { s: state, ctx, events: [] };
  emit(tx, 'GAME_STARTED', ALL, { playerIds: state.players.map((p) => p.id) });
  const wolfIds = state.players.filter((p) => ROLE_TEAM[p.role] === 'wolves').map((p) => p.id);
  for (const p of state.players) {
    emit(tx, 'ROLE_ASSIGNED', toPlayer(p.id), {
      role: p.role,
      wolfTeam: ROLE_TEAM[p.role] === 'wolves' ? wolfIds : [],
    });
  }
  enterPhase(tx, 'ROLE_REVEAL');
  return { ok: true, state: tx.s, events: tx.events };
}
