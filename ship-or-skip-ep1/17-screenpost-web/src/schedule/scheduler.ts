export interface SchedulerState {
  lastRunMs: number;
  postsToday: number;
  postsDate: string; // YYYY-MM-DD
}

export class Scheduler {
  constructor(
    private readonly intervalMinutes: number,
    private readonly dailyCap = 6,
  ) {}

  private intervalMs(): number {
    return this.intervalMinutes * 60 * 1000;
  }

  isDue(state: SchedulerState, nowMs: number): boolean {
    return nowMs - state.lastRunMs >= this.intervalMs();
  }

  minutesUntilNext(state: SchedulerState, nowMs: number): number {
    const remaining = state.lastRunMs + this.intervalMs() - nowMs;
    return Math.max(0, Math.ceil(remaining / 60000));
  }

  /** Whether another post may go out today, given the current date. */
  canPost(state: SchedulerState, today: string): boolean {
    if (state.postsDate !== today) return true; // new day → counter resets
    return state.postsToday < this.dailyCap;
  }

  /** Returns updated state after a post is published. */
  recordPost(state: SchedulerState, nowMs: number, today: string): SchedulerState {
    const sameDay = state.postsDate === today;
    return {
      lastRunMs: nowMs,
      postsToday: sameDay ? state.postsToday + 1 : 1,
      postsDate: today,
    };
  }

  /** Stamp lastRun without counting a post (used when a pass produces no post). */
  recordRun(state: SchedulerState, nowMs: number): SchedulerState {
    return { ...state, lastRunMs: nowMs };
  }
}
