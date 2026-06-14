import { describe, it, expect } from "vitest";
import { createOperations } from "../../src/daemon/operations";
import { Store } from "../../src/store/store";
import { Scheduler } from "../../src/schedule/scheduler";
import type { Draft, GeneratedDraft, PublishResult } from "../../src/domain/types";
import type { Generator } from "../../src/generate/generator";
import type { Publisher } from "../../src/publish/publisher";

const gen: Generator = {
  generate: async (): Promise<GeneratedDraft> => ({
    interesting: true, x_thread: ["regen hook"], linkedin: "li", threads: "th",
    instagram: "ig", facebook: "fb", context: "ctx", why: "why",
  }),
};

const okPublisher: Publisher = {
  publish: async (): Promise<PublishResult> => ({ perPlatform: { twitter: { ok: true } } }),
};

function draft(): Draft {
  return {
    id: "d1", createdAt: "i", status: "pending", context: "c", why: "w", imagePath: "/tmp/a.png",
    content: { twitter: ["hook"], linkedin: "", threads: "", instagram: "", facebook: "" },
  };
}

describe("createOperations", () => {
  it("regenerate runs the generator with feedback folded into context", async () => {
    const store = new Store(":memory:");
    const ops = createOperations({
      store, generator: gen, publisher: okPublisher, scheduler: new Scheduler(60, 6),
      now: () => 0, collectors: [],
    });
    const out = await ops.regenerate(draft(), "punchier please");
    expect(out.content.twitter).toEqual(["regen hook"]);
  });

  it("publishDraft publishes to enabled platforms and records a post in the scheduler", async () => {
    const store = new Store(":memory:");
    store.setSettings({ enabledPlatforms: { twitter: true, linkedin: false, threads: false, instagram: false, facebook: false } });
    const ops = createOperations({
      store, generator: gen, publisher: okPublisher, scheduler: new Scheduler(60, 6),
      now: () => 1000, collectors: [],
    });
    const result = await ops.publishDraft(draft());
    expect(result.perPlatform.twitter.ok).toBe(true);
    const sched = JSON.parse(store.getMeta("scheduler")!);
    expect(sched.postsToday).toBe(1);
  });
});
