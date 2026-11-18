import type { Clock } from '../../lib/clock';

export type TimeoutHandler = (gameId: string, version: number) => Promise<void>;

/**
 * Fires a phase timeout once `endsAt` has passed (docs/03-technical-design.md §3.4). A fired
 * timeout only applies if the game is still at `version`, so stale or duplicate timers are no-ops.
 */
export interface PhaseScheduler {
  setHandler(handler: TimeoutHandler): void;
  schedule(gameId: string, version: number, endsAt: number): void;
  cancel(gameId: string): void;
  close(): void;
}

/** MVP implementation: in-process `setTimeout`. Timers are rebuilt from Mongo on boot. */
export class InProcessScheduler implements PhaseScheduler {
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private handler: TimeoutHandler = async () => {};

  constructor(private readonly clock: Clock) {}

  setHandler(handler: TimeoutHandler) {
    this.handler = handler;
  }

  schedule(gameId: string, version: number, endsAt: number) {
    this.cancel(gameId);
    // Small margin so the engine sees `now >= endsAt`.
    const delay = Math.max(0, endsAt - this.clock.now()) + 25;
    const timer = setTimeout(() => {
      this.timers.delete(gameId);
      void this.handler(gameId, version);
    }, delay);
    timer.unref?.();
    this.timers.set(gameId, timer);
  }

  cancel(gameId: string) {
    const timer = this.timers.get(gameId);
    if (timer) clearTimeout(timer);
    this.timers.delete(gameId);
  }

  close() {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }
}
