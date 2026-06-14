import type { SwipeEntry } from "./types";

export function engagementScore(e: SwipeEntry): number {
  return e.comments * 3 + e.likes + e.retweets * 2;
}

export function topByEngagement(entries: SwipeEntry[], n: number): SwipeEntry[] {
  return [...entries]
    .sort((a, b) => engagementScore(b) - engagementScore(a))
    .slice(0, n);
}
