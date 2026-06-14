import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { Store } from "../store/store";
import { TranscriptCollector } from "../collectors/transcript";
import { GitFilesCollector } from "../collectors/gitFiles";
import { ScreenshotCollector } from "../collectors/screenshot";
import { ClaudeGenerator, type Generator } from "../generate/generator";
import { runPass } from "../pipeline/runPass";
import type { GeneratedDraft } from "../domain/types";

async function main(): Promise<void> {
  const dataDir = join(homedir(), ".screenpost");
  mkdirSync(dataDir, { recursive: true });
  const store = new Store(join(dataDir, "screenpost.db"));

  const settings = store.getSettings();
  const claudeRoot = join(homedir(), ".claude");

  const collectors = [
    new ScreenshotCollector(),
    new TranscriptCollector(claudeRoot),
    new GitFilesCollector(settings.watchedFolders),
  ];

  let generator: Generator;
  const key = process.env.ANTHROPIC_API_KEY;
  if (key) {
    generator = new ClaudeGenerator(new Anthropic({ apiKey: key }) as any);
  } else {
    console.warn("[runOnce] ANTHROPIC_API_KEY not set — using stub generator");
    generator = {
      generate: async (ctx): Promise<GeneratedDraft> => ({
        interesting: true,
        x_thread: [`(stub) working on: ${ctx.text.slice(0, 80)}`],
        linkedin: "(stub) LinkedIn post",
        threads: "(stub) Threads post",
        instagram: "(stub) IG caption",
        facebook: "(stub) FB caption",
        context: ctx.text.slice(0, 60) || "screenshot only",
        why: ctx.signalsUsed.join(", "),
      }),
    };
  }

  const now = Date.now();
  const draft = await runPass({
    store,
    collectors,
    generator,
    windowStartMs: now - 60 * 60 * 1000,
    windowEndMs: now,
    nowIso: () => new Date().toISOString(),
    newId: () => randomUUID(),
  });

  if (!draft) {
    console.log("No draft produced (nothing interesting, or a near-duplicate).");
  } else {
    console.log("Draft created:", draft.id);
    console.log("Context:", draft.context);
    console.log("Why:", draft.why);
    console.log("X thread:", draft.content.twitter);
  }
  store.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
