import { type GameCommandType, type PlayerView, ROLE_TEAM, type RoleId } from '@werewolf/shared';
import { clone, findPlayer, hasKey, wolvesMayKill } from './state';
import type { GameState, PlayerState } from './types';

/**
 * Whether `viewer` may know `target`'s role. Dead players do NOT see every role: a dead hunter
 * still has to shoot, and dead players could pass information to the living out of band.
 */
function roleVisible(s: GameState, viewer: PlayerState | undefined, target: PlayerState) {
  if (s.phase.name === 'GAME_OVER') return true;
  if (viewer?.id === target.id) return true;
  if (viewer?.role === 'werewolf' && target.role === 'werewolf') return true;
  return !target.alive && s.rules.revealRoleOnDeath;
}

/** The command `p` is expected to send right now, if any. */
export function expectedCommand(s: GameState, p: PlayerState): GameCommandType | null {
  switch (s.phase.name) {
    case 'NIGHT':
      if (!p.alive) return null;
      if (s.phase.step === 2) return p.role === 'witch' ? 'WITCH_ACT' : null;
      if (p.role === 'werewolf') return wolvesMayKill(s) ? 'WOLF_VOTE' : null;
      if (p.role === 'guard') return 'GUARD_PROTECT';
      if (p.role === 'seer') return 'SEER_CHECK';
      return null;
    case 'VOTE':
      return p.alive ? 'DAY_VOTE' : null;
    case 'HUNTER_SHOT':
      return s.hunter.pendingId === p.id ? 'HUNTER_SHOOT' : null;
    default:
      return null;
  }
}

function hasSubmitted(s: GameState, p: PlayerState, cmd: GameCommandType | null): boolean {
  if (cmd === 'WOLF_VOTE') return hasKey(s.night.wolfVotes, p.id);
  if (cmd === 'DAY_VOTE') return hasKey(s.day.votes, p.id);
  if (cmd === 'HUNTER_SHOOT' || cmd === null) return false;
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
      team: ROLE_TEAM[viewer.role],
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
    wolfVotes: isNight && viewer?.role === 'werewolf' ? { ...s.night.wolfVotes } : null,
    dayVotes: s.phase.name === 'VOTE' ? { ...s.day.votes } : null,
    candidates: s.phase.name === 'VOTE' && s.day.candidates ? [...s.day.candidates] : null,
    accusedId: s.phase.name === 'DEFENSE' || s.phase.name === 'EXECUTION' ? s.day.accusedId : null,
    hunterId: s.phase.name === 'HUNTER_SHOT' ? s.hunter.pendingId : null,
    winner: s.winner,
  };
}
