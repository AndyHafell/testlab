import { describe, it, expect } from "vitest";
import { runPass } from "../../src/pipeline/runPass";
import { Store } from "../../src/store/store";
import type { Collector } from "../../src/collectors/collector";
import type { Generator } from "../../src/generate/generator";
import type { Signal, GeneratedDraft } from "../../src/domain/types";

function collector(signal: Signal): Collector {
  return { collect: async () => signal };
}

const goodGen: Generator = {
  generate: async (): Promise<GeneratedDraft> => ({
    interesting: true,
    x_thread: ["hook", "detail"],
    linkedin: "li",
    threads: "th",
    instagram: "ig",
    facebook: "fb",
    context: "built the scheduler",
    why: "transcript",
  }),
};

describe("runPass", () => {
  it("collects, generates, and stores a pending draft", async () => {
    const store = new Store(":memory:");
    const draft = await runPass({
      store,
      collectors: [collector({ kind: "transcript", ok: true, text: "built the scheduler" })],
      generator: goodGen,
      windowStartMs: 0,
      windowEndMs: 1000,
      nowIso: () => "2026-06-14T10:00:00.000Z",
      newId: () => "draft-1",
    });
    expect(draft?.id).toBe("draft-1");
    expect(store.listDrafts("pending")).toHaveLength(1);
    expect(draft?.content.twitter).toEqual(["hook", "detail"]);
  });

  it("produces nothing when the model says not interesting", async () => {
    const store = new Store(":memory:");
    const boringGen: Generator = {
      generate: async () => ({
        interesting: false,
        x_thread: [],
        linkedin: "",
        threads: "",
        instagram: "",
        facebook: "",
        context: "",
        why: "",
      }),
    };
    const draft = await runPass({
      store,
      collectors: [collector({ kind: "transcript", ok: true, text: "idle" })],
      generator: boringGen,
      windowStartMs: 0,
      windowEndMs: 1000,
      nowIso: () => "2026-06-14T10:00:00.000Z",
      newId: () => "draft-1",
    });
    expect(draft).toBeNull();
    expect(store.listDrafts()).toHaveLength(0);
  });

  it("skips generation when context near-duplicates a recent draft", async () => {
    const store = new Store(":memory:");
    store.insertDraft({
      id: "old",
      createdAt: "2026-06-14T09:00:00.000Z",
      status: "posted",
      context: "built the scheduler and wired it up",
      why: "transcript",
      content: { twitter: ["x"], linkedin: "", threads: "", instagram: "", facebook: "" },
    });
    let generatorCalled = false;
    const spyGen: Generator = {
      generate: async () => {
        generatorCalled = true;
        return goodGen.generate({} as any, {} as any);
      },
    };
    const draft = await runPass({
      store,
      collectors: [collector({ kind: "transcript", ok: true, text: "built the scheduler and wired it up" })],
      generator: spyGen,
      windowStartMs: 0,
      windowEndMs: 1000,
      nowIso: () => "2026-06-14T10:00:00.000Z",
      newId: () => "draft-2",
    });
    expect(draft).toBeNull();
    expect(generatorCalled).toBe(false);
  });

  it("survives a throwing collector and still uses the others", async () => {
    const store = new Store(":memory:");
    const throwing: Collector = {
      collect: async () => {
        throw new Error("collector boom");
      },
    };
    const draft = await runPass({
      store,
      collectors: [throwing, collector({ kind: "transcript", ok: true, text: "built the scheduler" })],
      generator: goodGen,
      windowStartMs: 0,
      windowEndMs: 1000,
      nowIso: () => "2026-06-14T10:00:00.000Z",
      newId: () => "draft-1",
    });
    expect(draft?.id).toBe("draft-1");
  });
});
