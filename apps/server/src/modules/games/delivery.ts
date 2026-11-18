import type { GameState } from '@werewolf/game-engine';
import type { Channel, EventAudience } from '@werewolf/shared';

/** Players who receive an event with this audience. Never broadcast blindly (NFR-01). */
export function recipientsOf(audience: EventAudience, state: GameState): string[] {
  switch (audience.kind) {
    case 'all':
      return state.players.map((p) => p.id);
    case 'wolves':
      return state.players.filter((p) => p.role === 'werewolf').map((p) => p.id);
    case 'dead':
      return state.players.filter((p) => !p.alive).map((p) => p.id);
    case 'player':
      return state.players.some((p) => p.id === audience.playerId) ? [audience.playerId] : [];
  }
}

export const canSee = (audience: EventAudience, state: GameState, userId: string) =>
  recipientsOf(audience, state).includes(userId);

/**
 * Who reads a chat channel during a game. Sending is gated separately by the engine's `canSend`
 * (turn-based speech); reading follows channel membership.
 */
export function channelReaders(channel: Channel, state: GameState): string[] {
  switch (channel) {
    case 'main':
      return state.players.map((p) => p.id);
    case 'wolves':
      return recipientsOf({ kind: 'wolves' }, state);
    case 'dead':
      return recipientsOf({ kind: 'dead' }, state);
    case 'lobby':
      return [];
  }
}
