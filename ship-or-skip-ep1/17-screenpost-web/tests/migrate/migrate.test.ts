import { describe, it, expect } from "vitest";
import { parseEnv, parseFeedback } from "../../src/migrate/migrate";

describe("migrate", () => {
  it("extracts Blotato key + account ids from a .env string", () => {
    const env = `
# comment
Blotato_API_KEY=blt_123
Blotato_X_Account_ID=13469
Blotato_LinkedIn_Account_ID=1918
ANTHROPIC_API_KEY=sk-ant
`;
    const out = parseEnv(env);
    expect(out.secrets.Blotato_API_KEY).toBe("blt_123");
    expect(out.secrets.ANTHROPIC_API_KEY).toBe("sk-ant");
    expect(out.accountIds.twitter).toBe("13469");
    expect(out.accountIds.linkedin).toBe("1918");
  });

  it("maps a feedback json array into swipe entries with ids", () => {
    const json = JSON.stringify([
      { date: "2026-03-31", tweet: "t", platform: "x", likes: 10, comments: 2, retweets: 1, impressions: 100, note: "n" },
    ]);
    const entries = parseFeedback(json, (i) => `id-${i}`);
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe("id-0");
    expect(entries[0].likes).toBe(10);
  });
});
