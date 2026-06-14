import { describe, it, expect } from "vitest";
import { buildPrompt, OUTPUT_SCHEMA } from "../../src/generate/prompt";
import type { FusedContext, SwipeEntry } from "../../src/domain/types";

const ctx: FusedContext = {
  imagePath: "/tmp/a.png",
  text: "## CLAUDE TRANSCRIPT\nbuilt the scheduler",
  signalsUsed: ["screenshot", "transcript"],
};

const swipe: SwipeEntry[] = [
  {
    id: "s1",
    date: "2026-03-31",
    tweet: "made an electron app to generate game assets locally",
    platform: "x",
    likes: 3800,
    comments: 134,
    retweets: 271,
    impressions: 188000,
    note: "anti-SaaS angle resonates",
  },
];

describe("buildPrompt", () => {
  it("includes the persona, the swipe example, and the fused context", () => {
    const { system, user } = buildPrompt(ctx, { persona: "PERSONA-X", swipeExamples: swipe });
    expect(system).toContain("PERSONA-X");
    expect(system).toContain("top-performing"); // style guidance references examples
    expect(system).toContain("electron app to generate game assets"); // swipe example injected
    expect(user).toContain("built the scheduler");
  });

  it("exposes a JSON schema requiring interesting + per-platform fields", () => {
    expect(OUTPUT_SCHEMA.required).toContain("interesting");
    expect(OUTPUT_SCHEMA.required).toContain("x_thread");
    expect(OUTPUT_SCHEMA.properties.x_thread.type).toBe("array");
    expect(OUTPUT_SCHEMA.additionalProperties).toBe(false);
  });
});
