import { describe, it, expect } from "vitest";
import { createApi, type ApiDeps } from "../../src/ipc/api";
import { Store } from "../../src/store/store";
import { InMemorySecretStore } from "../../src/secrets/secrets";
import type { Draft, PublishResult } from "../../src/domain/types";

function draft(p: Partial<Draft> = {}): Draft {
  return {
    id: "d1",
    createdAt: "2026-06-14T10:00:00.000Z",
    status: "pending",
    context: "c",
    why: "w",
    content: { twitter: ["hook"], linkedin: "li", threads: "th", instagram: "ig", facebook: "fb" },
    ...p,
  };
}

function makeDeps(over: Partial<ApiDeps> = {}): { deps: ApiDeps; store: Store } {
  const store = new Store(":memory:");
  const deps: ApiDeps = {
    store,
    secrets: new InMemorySecretStore(),
    newId: () => "generated-id",
    nowIso: () => "2026-06-14T10:00:00.000Z",
    runPassNow: async () => null,
    regenerate: async (d) => ({ ...d, content: { ...d.content, twitter: ["regenerated"] } }),
    publishDraft: async (): Promise<PublishResult> => ({ perPlatform: { twitter: { ok: true } } }),
    generateFromClip: async () => null,
    scheduler: { status: () => ({ paused: false, minutesUntilNext: 42, postsToday: 1, dailyCap: 6 }), pause: () => {}, resume: () => {} },
    ...over,
  };
  return { deps, store };
}

describe("createApi", () => {
  it("lists only pending drafts in the queue", async () => {
    const { deps, store } = makeDeps();
    store.insertDraft(draft({ id: "p", status: "pending" }));
    store.insertDraft(draft({ id: "posted", status: "posted" }));
    const api = createApi(deps);
    expect((await api.listQueue()).map((d) => d.id)).toEqual(["p"]);
  });

  it("approve applies edits, publishes, and marks posted on full success", async () => {
    const { deps, store } = makeDeps();
    store.insertDraft(draft());
    const api = createApi(deps);
    const res = await api.approve("d1", { twitter: ["edited hook"] });
    expect(res.result.perPlatform.twitter.ok).toBe(true);
    expect(store.getDraft("d1")?.status).toBe("posted");
    expect(store.getDraft("d1")?.content.twitter).toEqual(["edited hook"]);
  });

  it("approve marks failed when a platform fails", async () => {
    const { deps, store } = makeDeps({
      publishDraft: async () => ({ perPlatform: { twitter: { ok: false, error: "boom" } } }),
    });
    store.insertDraft(draft());
    const api = createApi(deps);
    await api.approve("d1");
    expect(store.getDraft("d1")?.status).toBe("failed");
  });

  it("regenerate replaces draft content via deps.regenerate", async () => {
    const { deps, store } = makeDeps();
    store.insertDraft(draft());
    const api = createApi(deps);
    const out = await api.regenerate("d1", "make it punchier");
    expect(out.content.twitter).toEqual(["regenerated"]);
    expect(store.getDraft("d1")?.content.twitter).toEqual(["regenerated"]);
  });

  it("reject sets status to rejected", async () => {
    const { deps, store } = makeDeps();
    store.insertDraft(draft());
    const api = createApi(deps);
    await api.reject("d1");
    expect(store.getDraft("d1")?.status).toBe("rejected");
  });

  it("addSwipe assigns a generated id and persists", async () => {
    const { deps, store } = makeDeps();
    const api = createApi(deps);
    const created = await api.addSwipe({
      date: "2026-06-14", tweet: "t", platform: "x", likes: 1, comments: 0, retweets: 0, impressions: 0, note: "",
    });
    expect(created.id).toBe("generated-id");
    expect(store.listSwipe()).toHaveLength(1);
  });

  it("setSecret + secretStatus never leak the value", async () => {
    const { deps } = makeDeps();
    const api = createApi(deps);
    await api.setSecret("ANTHROPIC_API_KEY", "sk-x");
    expect(await api.secretStatus()).toEqual({ ANTHROPIC_API_KEY: true });
  });

  it("schedulerStatus passes through and pause/resume delegate", async () => {
    let paused = false;
    const { deps } = makeDeps({
      scheduler: {
        status: () => ({ paused, minutesUntilNext: 5, postsToday: 0, dailyCap: 6 }),
        pause: () => { paused = true; },
        resume: () => { paused = false; },
      },
    });
    const api = createApi(deps);
    await api.pauseScheduler();
    expect((await api.schedulerStatus()).paused).toBe(true);
    await api.resumeScheduler();
    expect((await api.schedulerStatus()).paused).toBe(false);
  });
});
