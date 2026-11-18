import {
  type GameCommand,
  type GameEvent,
  isWolfRole,
  type PhaseName,
  type PhaseTimers,
  type RoleCounts,
  type RoleId,
  type RoomRules,
  RoomSettingsSchema,
  type RuleError,
} from '@werewolf/shared';
import { createGame } from '../create';
import { dispatch } from '../dispatch';
import { createRng } from '../rng';
import type { GameState } from '../types';

export const T0 = 1_700_000_000_000;

/** The default 8-player table used by most tests: p1..p8 in seat order. */
export const STANDARD_8: RoleId[] = [
  'werewolf', // p1
  'werewolf', // p2
  'seer', // p3
  'guard', // p4
  'witch', // p5
  'hunter', // p6
  'villager', // p7
  'villager', // p8
];

interface HarnessOptions {
  rules?: Partial<RoomRules>;
  timers?: Partial<PhaseTimers>;
  seed?: number;
}

/** Drives a game through the public engine API with roles fixed by seat. */
export class Harness {
  state: GameState;
  now = T0;
  readonly events: GameEvent[] = [];
  private readonly rng;

  constructor(roles: RoleId[] = STANDARD_8, opts: HarnessOptions = {}) {
    this.rng = createRng(opts.seed ?? 42);
    const counts: RoleCounts = {};
    for (const r of roles) counts[r] = (counts[r] ?? 0) + 1;
    const settings = RoomSettingsSchema.parse({
      roles: counts,
      rules: opts.rules ?? {},
      timers: opts.timers ?? {},
    });
    const players = roles.map((_, i) => ({ id: `p${i + 1}`, seat: i + 1 }));
    const result = createGame({ players, settings }, this.ctx());
    if (!result.ok) throw new Error(`createGame failed: ${result.error.message}`);
    // Fix the deal so tests can reason about seats.
    result.state.players.forEach((p, i) => {
      p.role = roles[i] as RoleId;
    });
    this.state = result.state;
  }

  ctx() {
    return { now: this.now, rng: this.rng };
  }

  get phase(): PhaseName {
    return this.state.phase.name;
  }

  get step(): number {
    return this.state.phase.step;
  }

  player(id: string) {
    const p = this.state.players.find((x) => x.id === id);
    if (!p) throw new Error(`no player ${id}`);
    return p;
  }

  isAlive(id: string) {
    return this.player(id).alive;
  }

  /** Sends a command and throws if the engine rejects it. Returns the new events. */
  act(actorId: string, command: GameCommand): GameEvent[] {
    const error = this.tryAct(actorId, command);
    if (error)
      throw new Error(`${actorId} ${command.type} rejected: ${error.code} ${error.message}`);
    return this.lastEvents;
  }

  private lastEvents: GameEvent[] = [];

  /** Sends a command and returns the rule error, or null on success. */
  tryAct(actorId: string, command: GameCommand): RuleError | null {
    const result = dispatch(this.state, { kind: 'command', actorId, command }, this.ctx());
    if (!result.ok) return result.error;
    this.state = result.state;
    this.lastEvents = result.events;
    this.events.push(...result.events);
    return null;
  }

  /** Jumps to the end of the current phase and fires its timeout. */
  timeout(): GameEvent[] {
    this.now = Math.max(this.now, this.state.phase.endsAt);
    const result = dispatch(this.state, { kind: 'timeout' }, this.ctx());
    if (!result.ok) throw new Error(`timeout rejected: ${result.error.message}`);
    this.state = result.state;
    this.lastEvents = result.events;
    this.events.push(...result.events);
    return result.events;
  }

  /** Fires timeouts until the phase (and optionally step) is reached. */
  advanceTo(phase: PhaseName, step = 1) {
    for (let i = 0; i < 50; i++) {
      if (this.phase === phase && this.step === step) return;
      this.timeout();
    }
    throw new Error(`never reached ${phase}/${step}; stuck at ${this.phase}/${this.step}`);
  }

  /**
   * Plays one night. Omitted actors skip. Wolves all vote for `kill`.
   * Leaves the game at DAWN (or wherever the night led).
   */
  night(plan: {
    kill?: string | null;
    guard?: string | null;
    seer?: string | null;
    heal?: boolean;
    poison?: string | null;
    /** Alpha wolf: infect tonight's victim. */
    infect?: boolean;
    /** Cupid (night 1): the couple. */
    cupid?: [string, string] | null;
  }) {
    this.advanceTo('NIGHT', 1);
    const cupid = this.state.players.find((p) => p.role === 'cupid' && p.alive);
    if (cupid && this.state.round === 1) {
      this.act(cupid.id, { type: 'CUPID_LINK', targetIds: plan.cupid ?? null });
    }
    for (const w of this.state.players.filter((p) => p.alive && isWolfRole(p.role))) {
      if (this.state.rules.noKillFirstNight && this.state.round === 1) break;
      const infect = w.role === 'alpha_wolf' && plan.infect ? { infect: true } : {};
      this.act(w.id, { type: 'WOLF_VOTE', targetId: plan.kill ?? null, ...infect });
    }
    const alive = (role: RoleId) => this.state.players.find((p) => p.role === role && p.alive);
    const guard = alive('guard');
    if (guard) this.act(guard.id, { type: 'GUARD_PROTECT', targetId: plan.guard ?? null });
    const seer = alive('seer');
    if (seer) this.act(seer.id, { type: 'SEER_CHECK', targetId: plan.seer ?? null });
    if (this.phase === 'NIGHT' && this.step === 1) this.timeout();
    const witch = alive('witch');
    if (this.phase === 'NIGHT' && this.step === 2 && witch) {
      this.act(witch.id, {
        type: 'WITCH_ACT',
        heal: plan.heal ?? false,
        poisonTargetId: plan.poison ?? null,
      });
    }
    if (this.phase === 'NIGHT') this.timeout();
  }

  /** Every listed voter votes; others abstain. Leaves the game right after the VOTE timeout. */
  vote(votes: Record<string, string | null>) {
    this.advanceTo('VOTE');
    for (const [voter, target] of Object.entries(votes)) {
      this.act(voter, { type: 'DAY_VOTE', targetId: target });
    }
    return this.timeout();
  }

  eventsOfType<T extends GameEvent['type']>(type: T) {
    return this.events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);
  }
}
