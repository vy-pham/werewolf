import { runCommand } from './actions';
import { onTimeout } from './phases';
import { clone, findPlayer, normalize, ruleError } from './state';
import type { EngineContext, EngineInput, EngineResult, GameState, Tx } from './types';

/**
 * The single entry point for changing a running game. Pure: the input state is never mutated, a
 * new state plus the events to route are returned. On a rule violation nothing changes.
 */
export function dispatch(state: GameState, input: EngineInput, ctx: EngineContext): EngineResult {
  if (state.phase.name === 'GAME_OVER' || state.phase.name === 'LOBBY') {
    return { ok: false, error: ruleError('CONFLICT', 'The game is not running') };
  }

  const tx: Tx = { s: normalize(clone(state)), ctx, events: [] };

  if (input.kind === 'timeout') {
    if (ctx.now < state.phase.endsAt) {
      return { ok: false, error: ruleError('CONFLICT', 'The phase has not expired yet') };
    }
    onTimeout(tx);
    return { ok: true, state: tx.s, events: tx.events };
  }

  const actor = findPlayer(tx.s, input.actorId);
  if (!actor) return { ok: false, error: ruleError('FORBIDDEN', 'Not a player in this game') };

  const error = runCommand(tx, actor, input.command);
  if (error) return { ok: false, error };
  return { ok: true, state: tx.s, events: tx.events };
}
