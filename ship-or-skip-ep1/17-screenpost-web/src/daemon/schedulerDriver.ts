import type { Store } from "../store/store";
import { Scheduler, type SchedulerState } from "../schedule/scheduler";
import type { Draft } from "../domain/types";
import type { SchedulerStatus } from "../ipc/contract";

const META_KEY = "scheduler";

interface PersistedState extends SchedulerState {
  paused: boolean;
}

const DEFAULT_STATE: PersistedState = {
  lastRunMs: 0,
  postsToday: 0,
  postsDate: "",
  paused: false,
};

export class SchedulerDriver {
  constructor(
    private readonly store: Store,
    private readonly scheduler: Scheduler,
    private readonly now: () => number = () => Date.now(),
    private readonly doPass: () => Promise<Draft | null> = async () => null,
  ) {}

  private load(): PersistedState {
    const raw = this.store.getMeta(META_KEY);
    return raw ? { ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<PersistedState>) } : { ...DEFAULT_STATE };
  }

  private save(state: PersistedState): void {
    this.store.setMeta(META_KEY, JSON.stringify(state));
  }

  status(): SchedulerStatus {
    const s = this.load();
    return {
      paused: s.paused,
      minutesUntilNext: this.scheduler.minutesUntilNext(s, this.now()),
      postsToday: s.postsToday,
      dailyCap: this.store.getSettings().dailyCap,
    };
  }

  pause(): void {
    this.save({ ...this.load(), paused: true });
  }

  resume(): void {
    this.save({ ...this.load(), paused: false });
  }

  async tick(): Promise<void> {
    const state = this.load();
    const nowMs = this.now();
    if (state.paused || !this.scheduler.isDue(state, nowMs)) return;
    // Daily-cap guardrail: once today's posted count hits the cap, stop
    // auto-drafting for the rest of the day, but still advance lastRun so the
    // bot resumes on schedule tomorrow.
    const today = new Date(nowMs).toISOString().slice(0, 10);
    if (!this.scheduler.canPost(state, today)) {
      this.save({ ...this.scheduler.recordRun(state, nowMs), paused: state.paused });
      return;
    }
    await this.doPass();
    this.save({ ...this.scheduler.recordRun(state, nowMs), paused: state.paused });
  }
}
