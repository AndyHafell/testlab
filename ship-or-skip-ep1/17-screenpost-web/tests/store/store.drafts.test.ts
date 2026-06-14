import { describe, it, expect } from "vitest";
import { Store } from "../../src/store/store";
import type { Draft } from "../../src/domain/types";

function draft(p: Partial<Draft> = {}): Draft {
  return {
    id: "d1",
    createdAt: "2026-06-14T10:00:00.000Z",
    status: "pending",
    context: "building the listener",
    why: "transcript + screenshot",
    imagePath: "/tmp/a.png",
    content: {
      twitter: ["hook", "detail"],
      linkedin: "li",
      threads: "th",
      instagram: "ig",
      facebook: "fb",
    },
    ...p,
  };
}

describe("Store drafts", () => {
  it("round-trips a draft including the content thread", () => {
    const s = new Store(":memory:");
    s.insertDraft(draft());
    const got = s.getDraft("d1");
    expect(got?.content.twitter).toEqual(["hook", "detail"]);
    expect(got?.status).toBe("pending");
  });

  it("lists drafts filtered by status, newest first", () => {
    const s = new Store(":memory:");
    s.insertDraft(draft({ id: "old", createdAt: "2026-06-14T09:00:00.000Z" }));
    s.insertDraft(draft({ id: "new", createdAt: "2026-06-14T11:00:00.000Z" }));
    s.insertDraft(draft({ id: "posted", status: "posted" }));
    const pending = s.listDrafts("pending");
    expect(pending.map((d) => d.id)).toEqual(["new", "old"]);
  });

  it("updates status, error, and publish result", () => {
    const s = new Store(":memory:");
    s.insertDraft(draft());
    s.setDraftStatus("d1", "posted");
    s.setDraftPublishResult("d1", { perPlatform: { twitter: { ok: true } } });
    const got = s.getDraft("d1");
    expect(got?.status).toBe("posted");
    expect(got?.publishResult?.perPlatform.twitter.ok).toBe(true);
  });
});
