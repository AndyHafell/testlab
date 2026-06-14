import { describe, it, expect } from "vitest";
import { Store } from "../../src/store/store";
import type { SwipeEntry } from "../../src/domain/types";

function sw(p: Partial<SwipeEntry>): SwipeEntry {
  return {
    id: "s1",
    date: "2026-01-01",
    tweet: "t",
    platform: "x",
    likes: 0,
    comments: 0,
    retweets: 0,
    impressions: 0,
    note: "",
    ...p,
  };
}

describe("Store swipe", () => {
  it("adds, lists, and returns top-N by engagement", () => {
    const s = new Store(":memory:");
    s.addSwipe(sw({ id: "low", likes: 1 }));
    s.addSwipe(sw({ id: "high", comments: 100 }));
    expect(s.listSwipe()).toHaveLength(2);
    expect(s.topSwipe(1)[0].id).toBe("high");
  });

  it("updates and removes an entry", () => {
    const s = new Store(":memory:");
    s.addSwipe(sw({ id: "s1", note: "before" }));
    s.updateSwipe("s1", { note: "after" });
    expect(s.listSwipe()[0].note).toBe("after");
    s.removeSwipe("s1");
    expect(s.listSwipe()).toHaveLength(0);
  });
});
