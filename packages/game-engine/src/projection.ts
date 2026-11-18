import type { GameCommandType, PlayerView, RoleId } from '@werewolf/shared';
import { currentSpeaker } from './phases';
import {
  canVote,
  clone,
  findPlayer,
  hasKey,
  isWolf,
  partnerOf,
  teamOf,
  wolvesMayKill,
} from './state';
import type { GameState, PlayerState } from './types';
import { voicePermissions } from './voice';

/**
 * Whether `viewer` may know `target`'s role. Dead players do NOT see every role: a dead hunter
 * still has to shoot, and dead players could pass information to the living out of band.
 */
function roleVisible(s: GameState, viewer: PlayerState | undefined, target: PlayerState) {
  if (s.phase.name === 'GAME_OVER') return true;
  if (viewer?.id === target.id) return true;
  if (viewer && isWolf(viewer) && isWolf(target)) return true;
  // Lovers know each other's role; a revealed fool is known to everyone.
  if (viewer && partnerOf(s, viewer.id)?.id === target.id) return true;
  if (s.memory.foolRevealedId === target.id) return true;
  return !target.alive && s.rules.revealRoleOnDeath;
}

/** The command `p` is expected to send right now, if any. */
export function expectedCommand(s: GameState, p: PlayerState): GameCommandType | null {
  switch (s.phase.name) {
    case 'NIGHT':
      if (!p.alive) return null;
      if (s.phase.step === 2) return p.role === 'witch' ? 'WITCH_ACT' : null;
      if (isWolf(p)) return wolvesMayKill(s) ? 'WOLF_VOTE' : null;
      if (p.role === 'cupid' && s.round === 1) return 'CUPID_LINK';
      if (p.role === 'guard') return 'GUARD_PROTECT';
      if (p.role === 'seer') return 'SEER_CHECK';
      return null;
    case 'DISCUSSION':
      return currentSpeaker(s) === p.id ? 'END_TURN' : null;
    case 'VOTE':
      return canVote(s, p) ? 'DAY_VOTE' : null;
    case 'HUNTER_SHOT':
      return s.hunter.pendingId === p.id ? 'HUNTER_SHOOT' : null;
    default:
      return null;
  }
}

function hasSubmitted(s: GameState, p: PlayerState, cmd: GameCommandType | null): boolean {
  if (cmd === 'WOLF_VOTE') return hasKey(s.night.wolfVotes, p.id);
  if (cmd === 'DAY_VOTE') return hasKey(s.day.votes, p.id);
  if (cmd === 'HUNTER_SHOOT' || cmd === 'END_TURN' || cmd === null) return false;
  return s.night.submitted.includes(p.id);
}

/** Everything `viewerId` may know. `null` = spectator. The ONLY state that may leave the server. */
export function projectFor(s: GameState, viewerId: string | null): PlayerView {
  const viewer = findPlayer(s, viewerId);
  const isNight = s.phase.name === 'NIGHT';

  let me: PlayerView['me'] = null;
  if (viewer) {
    const pendingAction = expectedCommand(s, viewer);
    me = {
      id: viewer.id,
      role: viewer.role,
      team: teamOf(s, viewer),
      alive: viewer.alive,
      pendingAction,
      submitted: hasSubmitted(s, viewer, pendingAction),
    };
    if (viewer.role === 'seer') me.seerResults = clone(s.memory.seerResults);
    if (viewer.role === 'guard') me.guardLastTargetId = s.memory.guardLastTargetId;
    if (viewer.role === 'witch') {
      me.witch = {
        healUsed: s.memory.witchHealUsed,
        poisonUsed: s.memory.witchPoisonUsed,
        victimId: isNight && s.phase.step === 2 && viewer.alive ? s.night.wolfTargetId : null,
      };
    }
    const partner = partnerOf(s, viewer.id);
    if (partner) me.partnerId = partner.id;
    if (viewer.role === 'cupid') me.cupidLinked = s.memory.lovers ? [...s.memory.lovers] : null;
    if (viewer.role === 'alpha_wolf') {
      me.alpha = { infectUsed: s.memory.infection !== null, infectTonight: s.night.alphaInfect };
    }
    if (viewer.role === 'fool') me.canVote = canVote(s, viewer);
  }

  return {
    round: s.round,
    phase: { ...s.phase },
    players: s.players.map((p) => ({
      id: p.id,
      seat: p.seat,
      alive: p.alive,
      role: roleVisible(s, viewer, p) ? p.role : (null as RoleId | null),
    })),
    me,
    wolfVotes: isNight && viewer && isWolf(viewer) ? { ...s.night.wolfVotes } : null,
    dayVotes: s.phase.name === 'VOTE' ? { ...s.day.votes } : null,
    candidates: s.phase.name === 'VOTE' && s.day.candidates ? [...s.day.candidates] : null,
    accusedId: s.phase.name === 'DEFENSE' || s.phase.name === 'EXECUTION' ? s.day.accusedId : null,
    hunterId: s.phase.name === 'HUNTER_SHOT' ? s.hunter.pendingId : null,
    speakerOrder: s.phase.name === 'DISCUSSION' ? [...s.day.speakerOrder] : null,
    speakerId: currentSpeaker(s),
    winner: s.winner,
    lovers: s.phase.name === 'GAME_OVER' && s.memory.lovers ? [...s.memory.lovers] : null,
    channels: voicePermissions(s, viewerId),
  };
}
