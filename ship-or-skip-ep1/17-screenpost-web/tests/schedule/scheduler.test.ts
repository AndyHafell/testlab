import { describe, it, expect } from "vitest";
import { Scheduler, type SchedulerState } from "../../src/schedule/scheduler";

const DAY = "2026-06-14";

function state(p: Partial<SchedulerState> = {}): SchedulerState {
  return { lastRunMs: 0, postsToday: 0, postsDate: DAY, ...p };
}

describe("Scheduler", () => {
  it("is due when interval has elapsed since lastRun", () => {
    const s = new Scheduler(60);
    const now = 60 * 60 * 1000 + 1;
    expect(s.isDue(state({ lastRunMs: 0 }), now)).toBe(true);
  });

  it("is not due before the interval elapses", () => {
    const s = new Scheduler(60);
    expect(s.isDue(state({ lastRunMs: 0 }), 60 * 1000)).toBe(false);
  });

  it("reports minutes until the next run", () => {
    const s = new Scheduler(60);
    const now = 30 * 60 * 1000; // 30 min in
    expect(s.minutesUntilNext(state({ lastRunMs: 0 }), now)).toBe(30);
  });

  it("blocks new posts once the daily cap is hit and resets at a new date", () => {
    const s = new Scheduler(60, 6);
    expect(s.canPost(state({ postsToday: 6, postsDate: DAY }), DAY)).toBe(false);
    expect(s.canPost(state({ postsToday: 6, postsDate: DAY }), "2026-06-15")).toBe(true);
  });

  it("records a run by stamping lastRun and incrementing today's count on a new date", () => {
    const s = new Scheduler(60, 6);
    const next = s.recordPost(state({ postsToday: 6, postsDate: DAY }), 123, "2026-06-15");
    expect(next.lastRunMs).toBe(123);
    expect(next.postsToday).toBe(1);
    expect(next.postsDate).toBe("2026-06-15");
  });
});
