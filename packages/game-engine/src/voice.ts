import type { ChannelGrant, VoiceGrant } from '@werewolf/shared';
import { findPlayer } from './state';
import type { GameState } from './types';

const TALK: ChannelGrant = { publish: true, subscribe: true };
const LISTEN: ChannelGrant = { publish: false, subscribe: true };

/**
 * Who may speak / listen on which channel right now (docs/04-game-rules.md §8). Applies to voice,
 * text chat and captions. The server enforces it (LiveKit permissions), never the client.
 * `viewerId: null` = spectator.
 */
export function voicePermissions(s: GameState, viewerId: string | null): VoiceGrant {
  const phase = s.phase.name;
  if (phase === 'GAME_OVER') return { main: { ...TALK } };

  const p = findPlayer(s, viewerId);
  const nightLike = phase === 'ROLE_REVEAL' || phase === 'NIGHT';

  if (!p) return nightLike ? {} : { main: { ...LISTEN } };

  if (!p.alive) {
    const dead = { dead: { ...TALK } };
    if (nightLike) return dead;
    const hunterSpeaking = phase === 'HUNTER_SHOT' && s.hunter.pendingId === p.id;
    return { main: { ...(hunterSpeaking ? TALK : LISTEN) }, ...dead };
  }

  if (nightLike) return p.role === 'werewolf' ? { wolves: { ...TALK } } : {};
  if (phase === 'DEFENSE') return { main: { ...(s.day.accusedId === p.id ? TALK : LISTEN) } };
  if (phase === 'HUNTER_SHOT') return { main: { ...LISTEN } };
  return { main: { ...TALK } };
}
