import type { Platform, SwipeEntry } from "../domain/types";

export interface ParsedEnv {
  secrets: Record<string, string>;
  accountIds: Partial<Record<Platform, string>>;
}

export function parseEnv(text: string): ParsedEnv {
  const secrets: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    secrets[key] = value;
  }
  const accountIds: Partial<Record<Platform, string>> = {};
  if (secrets["Blotato_X_Account_ID"]) accountIds.twitter = secrets["Blotato_X_Account_ID"];
  if (secrets["Blotato_LinkedIn_Account_ID"]) accountIds.linkedin = secrets["Blotato_LinkedIn_Account_ID"];
  return { secrets, accountIds };
}

export function parseFeedback(json: string, newId: (i: number) => string): SwipeEntry[] {
  let raw: any[];
  try {
    raw = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  return raw.map((e, i) => ({
    id: newId(i),
    date: String(e.date ?? ""),
    tweet: String(e.tweet ?? ""),
    platform: String(e.platform ?? "x"),
    likes: Number(e.likes ?? 0),
    comments: Number(e.comments ?? 0),
    retweets: Number(e.retweets ?? 0),
    impressions: Number(e.impressions ?? 0),
    note: String(e.note ?? ""),
  }));
}
