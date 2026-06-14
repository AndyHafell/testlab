import { readdirSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Collector } from "./collector";
import type { Signal } from "../domain/types";

const MAX_CHARS = 4000;

/** Reads ~/.claude/projects/<proj>/<session>.jsonl and digests recent activity. */
export class TranscriptCollector implements Collector {
  constructor(private readonly claudeRoot: string) {}

  async collect(windowStartMs: number, windowEndMs: number): Promise<Signal> {
    try {
      const files = this.recentJsonl(windowStartMs, windowEndMs);
      if (files.length === 0) {
        return { kind: "transcript", ok: false, text: "" };
      }
      const parts: string[] = [];
      for (const file of files) {
        for (const line of readFileSync(file, "utf8").split("\n")) {
          const text = extractText(line);
          if (text) parts.push(text);
        }
      }
      const digest = parts.join("\n").slice(0, MAX_CHARS).trim();
      return digest
        ? { kind: "transcript", ok: true, text: digest }
        : { kind: "transcript", ok: false, text: "" };
    } catch (e) {
      return { kind: "transcript", ok: false, error: String(e) };
    }
  }

  private recentJsonl(startMs: number, endMs: number): string[] {
    const projects = join(this.claudeRoot, "projects");
    const out: string[] = [];
    let projDirs: string[];
    try {
      projDirs = readdirSync(projects);
    } catch {
      return out;
    }
    for (const proj of projDirs) {
      const dir = join(projects, proj);
      let entries: string[];
      try {
        entries = readdirSync(dir);
      } catch {
        continue;
      }
      for (const name of entries) {
        if (!name.endsWith(".jsonl")) continue;
        const full = join(dir, name);
        const m = statSync(full).mtimeMs;
        if (m >= startMs && m < endMs) out.push(full);
      }
    }
    return out;
  }
}

function extractText(line: string): string | null {
  if (!line.trim()) return null;
  let obj: any;
  try {
    obj = JSON.parse(line);
  } catch {
    return null;
  }
  const content = obj?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((b) => b?.type === "text" && typeof b.text === "string")
      .map((b) => b.text)
      .join(" ");
  }
  return null;
}
