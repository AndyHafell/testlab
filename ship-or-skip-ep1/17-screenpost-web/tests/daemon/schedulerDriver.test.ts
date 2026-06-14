import { describe, it, expect } from "vitest";
import { SchedulerDriver } from "../../src/daemon/schedulerDriver";
import { Store } from "../../src/store/store";
import { Scheduler } from "../../src/schedule/scheduler";
import type { Draft } from "../../src/domain/types";

function fakeDraft(): Draft {
  return {
    id: "d1", createdAt: "i", status: "pending", context: "c", why: "w",
    content: { twitter: ["x"], linkedin: "", threads: "", instagram: "", facebook: "" },
  };
}

describe("SchedulerDriver", () => {
  it("runs a pass when due and stamps lastRun", async () => {
    const store = new Store(":memory:");
    let nowMs = 0;
    let ran = 0;
    const driver = new SchedulerDriver(store, new Scheduler(60, 6), () => nowMs, async () => { ran++; return fakeDraft(); });
    nowMs = 60 * 60 * 1000 + 1; // an hour later
    await driver.tick();
    expect(ran).toBe(1);
    // immediately ticking again is not due
    await driver.tick();
    expect(ran).toBe(1);
  });

  it("does not run while paused, and resumes afterward", async () => {
    const store = new Store(":memory:");
    let nowMs = 60 * 60 * 1000 + 1;
    let ran = 0;
    const driver = new SchedulerDriver(store, new Scheduler(60, 6), () => nowMs, async () => { ran++; return null; });
    driver.pause();
    await driver.tick();
    expect(ran).toBe(0);
    expect(driver.status().paused).toBe(true);
    driver.resume();
    await driver.tick();
    expect(ran).toBe(1);
  });

  it("reports minutesUntilNext and persists state across instances", async () => {
    const store = new Store(":memory:");
    let nowMs = 60 * 60 * 1000;
    const a = new SchedulerDriver(store, new Scheduler(60, 6), () => nowMs, async () => null);
    await a.tick(); // due → runs, stamps lastRun = nowMs
    nowMs += 30 * 60 * 1000; // 30 min later
    const b = new SchedulerDriver(store, new Scheduler(60, 6), () => nowMs, async () => null);
    expect(b.status().minutesUntilNext).toBe(30);
  });

  it("does not draft a pass once today's daily cap is reached", async () => {
    const store = new Store(":memory:");
    const nowMs = 60 * 60 * 1000 + 1; // due
    const today = new Date(nowMs).toISOString().slice(0, 10);
    // Seed scheduler state at the cap for today.
    store.setMeta(
      "scheduler",
      JSON.stringify({ lastRunMs: 0, postsToday: 6, postsDate: today, paused: false }),
    );
    let ran = 0;
    const driver = new SchedulerDriver(store, new Scheduler(60, 6), () => nowMs, async () => {
      ran++;
      return null;
    });
    await driver.tick();
    expect(ran).toBe(0); // cap reached → no drafting
    // lastRun still advanced so it waits the next interval rather than hammering.
    expect(JSON.parse(store.getMeta("scheduler")!).lastRunMs).toBe(nowMs);
  });
});
