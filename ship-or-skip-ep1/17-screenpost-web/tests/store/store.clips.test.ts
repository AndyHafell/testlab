import { describe, it, expect } from "vitest";
import { Store } from "../../src/store/store";
import type { ClipItem } from "../../src/domain/types";

function clip(p: Partial<ClipItem> = {}): ClipItem {
  return {
    id: "c1",
    kind: "text",
    createdAt: "2026-06-14T10:00:00.000Z",
    sourceApp: "Code",
    textContent: "hello",
    hash: "h1",
    ...p,
  };
}

describe("Store clips", () => {
  it("adds a clip and detects duplicate hashes", () => {
    const s = new Store(":memory:");
    expect(s.hasClipHash("h1")).toBe(false);
    s.addClip(clip());
    expect(s.hasClipHash("h1")).toBe(true);
  });

  it("lists clips newest first with paging", () => {
    const s = new Store(":memory:");
    s.addClip(clip({ id: "a", hash: "a", createdAt: "2026-06-14T09:00:00.000Z" }));
    s.addClip(clip({ id: "b", hash: "b", createdAt: "2026-06-14T11:00:00.000Z" }));
    expect(s.listClips(10, 0).map((c) => c.id)).toEqual(["b", "a"]);
  });
});
