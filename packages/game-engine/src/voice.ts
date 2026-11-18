import type { Channel, ChannelGrant, VoiceGrant } from '@werewolf/shared';
import { currentSpeaker } from './phases';
import { findPlayer } from './state';
import type { GameState } from './types';

const TALK: ChannelGrant = { publish: true, subscribe: true };
const LISTEN: ChannelGrant = { publish: false, subscribe: true };

/**
 * Who may speak / listen on which channel right now (docs/04-game-rules.md §8). The same grant
 * governs voice, text chat and captions; the server enforces it (LiveKit permissions + chat
 * filter), never the client. `viewerId: null` = spectator.
 *
 * Turn-based speech: the wolves' channel opens only while wolves are awake (night step 1); during
 * DISCUSSION only the current speaker talks; nobody talks while voting; DEFENSE / HUNTER_SHOT give
 * the floor to one player. The dead may always talk among themselves.
 */
export function voicePermissions(s: GameState, viewerId: string | null): VoiceGrant {
  const phase = s.phase.name;
  if (phase === 'GAME_OVER') return { main: { ...TALK } };

  const p = findPlayer(s, viewerId);
  const nightLike = phase === 'ROLE_REVEAL' || phase === 'NIGHT';
  const dead = p && !p.alive ? { dead: { ...TALK } } : {};

  if (nightLike) {
    const wolvesAwake = phase === 'NIGHT' && s.phase.step === 1;
    if (p?.alive && p.role === 'werewolf' && wolvesAwake) return { wolves: { ...TALK } };
    return dead;
  }

  // Day-like phases: everyone (living, dead, spectators) listens to main; at most one speaker.
  const speakerId = floorHolder(s);
  const main = p && speakerId === p.id ? { ...TALK } : { ...LISTEN };
  return { main, ...dead };
}

/** The single player allowed to speak on `main` right now, if any. */
function floorHolder(s: GameState): string | null {
  switch (s.phase.name) {
    case 'DISCUSSION':
      return currentSpeaker(s);
    case 'DEFENSE':
      return s.day.accusedId;
    case 'HUNTER_SHOT':
      return s.hunter.pendingId;
    default:
      return null;
  }
}

/** Whether `viewerId` may send a text message (or speak) on `channel` right now. */
export function canSend(
  s: GameState,
  viewerId: string | null,
  channel: Exclude<Channel, 'lobby'>,
): boolean {
  return voicePermissions(s, viewerId)[channel]?.publish === true;
}
