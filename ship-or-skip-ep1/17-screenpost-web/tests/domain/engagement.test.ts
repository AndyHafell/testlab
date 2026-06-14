import { describe, it, expect } from "vitest";
import { engagementScore, topByEngagement } from "../../src/domain/engagement";
import type { SwipeEntry } from "../../src/domain/types";

function entry(p: Partial<SwipeEntry>): SwipeEntry {
  return {
    id: "x",
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

describe("engagement", () => {
  it("scores comments x3 + likes + retweets x2", () => {
    expect(engagementScore(entry({ likes: 10, comments: 2, retweets: 3 }))).toBe(
      10 + 6 + 6,
    );
  });

  it("returns the top N entries by score, highest first", () => {
    const a = entry({ id: "a", likes: 100 });
    const b = entry({ id: "b", comments: 100 });
    const c = entry({ id: "c", likes: 1 });
    const top = topByEngagement([a, c, b], 2);
    expect(top.map((e) => e.id)).toEqual(["b", "a"]);
  });
});
