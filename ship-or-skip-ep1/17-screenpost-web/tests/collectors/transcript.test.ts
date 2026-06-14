import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TranscriptCollector } from "../../src/collectors/transcript";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "sp-transcript-"));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function writeSession(name: string, lines: object[], mtimeMs: number): string {
  const dir = join(root, "projects", "proj-a");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, name);
  writeFileSync(file, lines.map((l) => JSON.stringify(l)).join("\n"));
  utimesSync(file, mtimeMs / 1000, mtimeMs / 1000);
  return file;
}

describe("TranscriptCollector", () => {
  it("digests user/assistant text from sessions modified in the window", async () => {
    const t = 1_000_000_000_000;
    writeSession(
      "s1.jsonl",
      [
        { type: "user", message: { content: "add a hourly scheduler" } },
        { type: "assistant", message: { content: [{ type: "text", text: "Done — added scheduler.ts" }] } },
      ],
      t + 1000,
    );
    const c = new TranscriptCollector(root);
    const sig = await c.collect(t, t + 2000);
    expect(sig.kind).toBe("transcript");
    expect(sig.ok).toBe(true);
    expect(sig.text).toContain("hourly scheduler");
    expect(sig.text).toContain("scheduler.ts");
  });

  it("returns ok:false text-empty when no sessions fall in the window", async () => {
    writeSession("old.jsonl", [{ type: "user", message: { content: "x" } }], 500);
    const c = new TranscriptCollector(root);
    const sig = await c.collect(1_000_000, 2_000_000);
    expect(sig.ok).toBe(false);
  });
});
