import type { DeathCause, PhaseName, RoleId } from '@werewolf/shared';
import { pick, shuffle } from './rng';
import {
  ALL,
  aliveWolves,
  emit,
  emptyDay,
  emptyNight,
  findPlayer,
  hasKey,
  holderOf,
  partnerOf,
  toPlayer,
  WOLVES,
  wolvesMayKill,
} from './state';
import type { GameState, Tx } from './types';
import { checkWinner } from './winner';

function durationSeconds(s: GameState, name: PhaseName, step: number): number {
  const t = s.timers;
  switch (name) {
    case 'ROLE_REVEAL':
      return t.roleRevealSeconds;
    case 'NIGHT':
      return step === 1 ? t.nightActionSeconds : t.witchSeconds;
    case 'DAWN':
    case 'EXECUTION':
      return t.dawnSeconds;
    case 'HUNTER_SHOT':
      return t.hunterSeconds;
    case 'DISCUSSION':
      return t.speakingSeconds;
    case 'VOTE':
      return t.voteSeconds;
    case 'DEFENSE':
      return t.defenseSeconds;
    case 'LOBBY':
    case 'GAME_OVER':
      return 0;
  }
}

export function enterPhase(tx: Tx, name: PhaseName, opts: { step?: number; revote?: number } = {}) {
  const step = opts.step ?? 1;
  const revote = opts.revote ?? 0;
  const endsAt = tx.ctx.now + durationSeconds(tx.s, name, step) * 1000;
  tx.s.phase = { name, step, endsAt, revote };
  emit(tx, 'PHASE_CHANGED', ALL, { name, step, round: tx.s.round, endsAt, revote });
}

// ── Night ────────────────────────────────────────────────────────────────────

export function startNight(tx: Tx) {
  tx.s.round += 1;
  tx.s.night = emptyNight();
  tx.s.day = emptyDay();
  enterPhase(tx, 'NIGHT');
}

/**
 * Has the holder of a unique night role finished? A dead holder counts as finished only when
 * deaths reveal roles; otherwise we wait for the timer so that an early end cannot leak that
 * this role is dead (docs/04-game-rules.md §4).
 */
function slotDone(s: GameState, role: RoleId): boolean {
  if (!s.roleCounts[role]) return true;
  const holder = holderOf(s, role);
  // No holder: the alpha infected them. That is never revealed, so wait for the timer.
  if (!holder) return false;
  if (holder.alive) return s.night.submitted.includes(holder.id);
  return s.rules.revealRoleOnDeath;
}

export function nightStepComplete(s: GameState): boolean {
  if (s.phase.step === 2) return slotDone(s, 'witch');
  const wolvesDone =
    !wolvesMayKill(s) || aliveWolves(s).every((w) => hasKey(s.night.wolfVotes, w.id));
  // Cupid only acts on night 1 (and nobody can be dead yet then).
  const cupidDone = s.round !== 1 || slotDone(s, 'cupid');
  return wolvesDone && cupidDone && slotDone(s, 'guard') && slotDone(s, 'seer');
}

function resolveWolfTarget(tx: Tx): string | null {
  const { s } = tx;
  if (!wolvesMayKill(s)) return null;
  const counts = new Map<string, number>();
  for (const wolf of aliveWolves(s)) {
    const target = s.night.wolfVotes[wolf.id];
    if (target) counts.set(target, (counts.get(target) ?? 0) + 1);
  }
  const top = Math.max(0, ...counts.values());
  if (top === 0) return null;
  const leaders = [...counts].filter(([, n]) => n === top).map(([id]) => id);
  if (leaders.length === 1) return leaders[0] ?? null;
  return s.rules.wolfTieBreak === 'random' ? pick(leaders.sort(), tx.ctx.rng) : null;
}

/** Called when the current night step is complete or its timer expired. */
export function finishNightStep(tx: Tx) {
  const { s } = tx;
  if (s.phase.step === 1) {
    s.night.wolfTargetId = resolveWolfTarget(tx);
    // Alpha wolf's infection: the victim is not attacked but converted, so the witch sees nobody.
    const alpha = holderOf(s, 'alpha_wolf');
    if (s.night.wolfTargetId && s.night.alphaInfect && alpha?.alive && !s.memory.infection) {
      s.night.infectTargetId = s.night.wolfTargetId;
      s.night.wolfTargetId = null;
    }
    // Step 2 runs whenever the role set has a witch (even a dead one) so its presence is not leaked.
    if (s.roleCounts.witch) {
      enterPhase(tx, 'NIGHT', { step: 2 });
      const witch = holderOf(s, 'witch');
      if (witch?.alive) {
        emit(tx, 'WITCH_INFO', toPlayer(witch.id), { victimId: s.night.wolfTargetId });
      }
      return;
    }
  }
  resolveNight(tx);
}

function resolveNight(tx: Tx) {
  const { s } = tx;
  const { night, memory } = s;
  const deaths = new Map<string, DeathCause>();

  // The guard also blocks the infection (then the alpha keeps it for another night).
  const infected = night.infectTargetId;
  if (infected && infected !== night.guardTargetId) infect(tx, infected);

  const victim = findPlayer(s, night.wolfTargetId);
  if (victim && victim.id !== night.guardTargetId && !night.witchHeal) {
    if (victim.role === 'elder' && memory.elderHits === 0) {
      memory.elderHits = 1;
      emit(tx, 'ELDER_SURVIVED', toPlayer(victim.id), {});
    } else {
      deaths.set(victim.id, 'wolves');
    }
  }
  // Guard protection does not block poison.
  if (night.witchPoisonId) deaths.set(night.witchPoisonId, 'poison');

  memory.guardLastTargetId = night.guardTargetId;
  if (night.witchHeal) memory.witchHealUsed = true;
  if (night.witchPoisonId) memory.witchPoisonUsed = true;

  enterPhase(tx, 'DAWN');
  // Shuffled so the announcement order does not reveal the cause of death.
  const ids = shuffle([...deaths.keys()].sort(), tx.ctx.rng);
  if (ids.length === 0) emit(tx, 'NO_DEATHS', ALL, {});
  for (const id of ids) killPlayer(tx, id, deaths.get(id) ?? 'wolves');
}

/** The infected player becomes a werewolf (keeps their seat; their old ability is gone). */
function infect(tx: Tx, playerId: string) {
  const { s } = tx;
  const p = findPlayer(s, playerId);
  if (!p?.alive) return;
  s.memory.infection = { targetId: p.id, originalRole: p.role };
  p.role = 'werewolf';
  emit(tx, 'INFECTED', toPlayer(p.id), { wolfTeam: aliveWolves(s).map((w) => w.id) });
  emit(tx, 'WOLF_JOINED', WOLVES, { playerId: p.id });
}

// ── Deaths, hunter, win check ────────────────────────────────────────────────

export function killPlayer(tx: Tx, playerId: string, cause: DeathCause) {
  const { s } = tx;
  const p = findPlayer(s, playerId);
  if (!p?.alive) return;
  p.alive = false;
  p.death = { round: s.round, cause };
  emit(tx, 'PLAYER_DIED', ALL, {
    playerId: p.id,
    role: s.rules.revealRoleOnDeath ? p.role : null,
  });
  const canShoot = cause !== 'hunter' && (cause !== 'poison' || s.rules.hunterShootsWhenPoisoned);
  if (p.role === 'hunter' && canShoot) s.hunter.pendingId = p.id;
  // Lovers: when one dies, the other dies of a broken heart.
  const partner = partnerOf(s, p.id);
  if (partner?.alive) killPlayer(tx, partner.id, 'heartbreak');
}

/** After DAWN or EXECUTION: let a dying hunter shoot, then check the winner and move on. */
export function continueAfterDeaths(tx: Tx, next: 'DISCUSSION' | 'NIGHT') {
  if (tx.s.hunter.pendingId) {
    tx.s.hunter.next = next;
    enterPhase(tx, 'HUNTER_SHOT');
    return;
  }
  checkWinnerOr(tx, next);
}

export function resolveHunterShot(tx: Tx, targetId: string | null) {
  const { s } = tx;
  const hunterId = s.hunter.pendingId;
  if (!hunterId) return;
  s.hunter.pendingId = null;
  emit(tx, 'HUNTER_SHOT', ALL, { hunterId, targetId });
  if (targetId) killPlayer(tx, targetId, 'hunter');
  checkWinnerOr(tx, s.hunter.next);
}

function checkWinnerOr(tx: Tx, next: 'DISCUSSION' | 'NIGHT') {
  const { s } = tx;
  const winner = checkWinner(s.players, s.memory.lovers);
  if (winner) {
    s.winner = winner;
    enterPhase(tx, 'GAME_OVER');
    emit(tx, 'GAME_OVER', ALL, {
      winner,
      roles: Object.fromEntries(s.players.map((p) => [p.id, p.role])),
      lovers: s.memory.lovers,
    });
    return;
  }
  if (next === 'DISCUSSION') startDiscussion(tx);
  else startNight(tx);
}

// ── Day: speaking turns ──────────────────────────────────────────────────────

/**
 * DISCUSSION is a series of speaking turns: every living player, in seat order, holds the floor
 * for `speakingSeconds` (phase.step = 1-based turn). The first speaker rotates each day.
 */
function startDiscussion(tx: Tx) {
  const { s } = tx;
  const alive = s.players
    .filter((p) => p.alive)
    .sort((a, b) => a.seat - b.seat)
    .map((p) => p.id);
  const offset = alive.length > 0 ? (s.round - 1) % alive.length : 0;
  s.day = { ...emptyDay(), speakerOrder: [...alive.slice(offset), ...alive.slice(0, offset)] };
  startTurn(tx, 1);
}

function startTurn(tx: Tx, turn: number) {
  const { s } = tx;
  const speakerId = s.day.speakerOrder[turn - 1];
  if (!speakerId) {
    startVote(tx);
    return;
  }
  enterPhase(tx, 'DISCUSSION', { step: turn });
  emit(tx, 'SPEAKER_CHANGED', ALL, {
    speakerId,
    turn,
    total: s.day.speakerOrder.length,
    endsAt: s.phase.endsAt,
  });
}

/** The player holding the floor right now, if any. */
export const currentSpeaker = (s: GameState): string | null =>
  s.phase.name === 'DISCUSSION' ? (s.day.speakerOrder[s.phase.step - 1] ?? null) : null;

/** Ends the current turn (speaker pressed "done" or the timer ran out). */
export function nextSpeaker(tx: Tx) {
  startTurn(tx, tx.s.phase.step + 1);
}

// ── Day: vote ────────────────────────────────────────────────────────────────

export function startVote(tx: Tx, candidates: string[] | null = null, revote = 0) {
  tx.s.day = { ...tx.s.day, votes: {}, candidates, accusedId: null };
  enterPhase(tx, 'VOTE', { revote });
}

function resolveVote(tx: Tx) {
  const { s } = tx;
  const tally: Record<string, number> = {};
  let skips = 0;
  for (const voter of s.players.filter((p) => p.alive)) {
    if (!hasKey(s.day.votes, voter.id)) continue; // abstained
    const target = s.day.votes[voter.id];
    if (target) tally[target] = (tally[target] ?? 0) + 1;
    else skips++;
  }
  const top = Math.max(0, ...Object.values(tally));
  const leaders = Object.keys(tally)
    .filter((id) => tally[id] === top)
    .sort();
  const decisive = top > 0 && top > skips;
  const executedId = decisive && leaders.length === 1 ? (leaders[0] ?? null) : null;
  const tie = decisive && leaders.length > 1 ? leaders : [];
  const revote =
    tie.length > 0 && s.rules.voteTieBreak === 'revote' && s.phase.revote < s.rules.maxRevotes;

  emit(tx, 'VOTE_RESULT', ALL, { tally, skips, executedId, tie, revote });

  if (executedId) {
    s.day.accusedId = executedId;
    if (s.timers.defenseSeconds > 0) enterPhase(tx, 'DEFENSE');
    else startExecution(tx);
  } else if (revote) {
    startVote(tx, tie, s.phase.revote + 1);
  } else {
    startNight(tx);
  }
}

function startExecution(tx: Tx) {
  const { s } = tx;
  enterPhase(tx, 'EXECUTION');
  const accused = findPlayer(s, s.day.accusedId);
  if (!accused) return;
  // The fool survives their first execution: revealed, alive, no longer allowed to vote.
  if (accused.role === 'fool' && s.memory.foolRevealedId === null) {
    s.memory.foolRevealedId = accused.id;
    emit(tx, 'FOOL_REVEALED', ALL, { playerId: accused.id });
    return;
  }
  killPlayer(tx, accused.id, 'execution');
}

// ── Timeouts ─────────────────────────────────────────────────────────────────

/** Default behaviour when a phase timer expires: missing actions count as "skip". */
export function onTimeout(tx: Tx) {
  switch (tx.s.phase.name) {
    case 'ROLE_REVEAL':
      return startNight(tx);
    case 'NIGHT':
      return finishNightStep(tx);
    case 'DAWN':
      return continueAfterDeaths(tx, 'DISCUSSION');
    case 'DISCUSSION':
      return nextSpeaker(tx);
    case 'VOTE':
      return resolveVote(tx);
    case 'DEFENSE':
      return startExecution(tx);
    case 'EXECUTION':
      return continueAfterDeaths(tx, 'NIGHT');
    case 'HUNTER_SHOT':
      return resolveHunterShot(tx, null);
    case 'LOBBY':
    case 'GAME_OVER':
      return;
  }
}
