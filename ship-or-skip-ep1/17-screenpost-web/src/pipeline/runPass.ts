import type { Collector } from "../collectors/collector";
import type { Generator } from "../generate/generator";
import type { Store } from "../store/store";
import type { Draft, Signal } from "../domain/types";
import { buildContext } from "../context/buildContext";
import { isNearDuplicate } from "./dedup";

export interface RunPassDeps {
  store: Store;
  collectors: Collector[];
  generator: Generator;
  windowStartMs: number;
  windowEndMs: number;
  nowIso: () => string;
  newId: () => string;
  /** How many recent drafts to compare against for dedup. */
  recentForDedup?: number;
}

export async function runPass(deps: RunPassDeps): Promise<Draft | null> {
  const {
    store,
    collectors,
    generator,
    windowStartMs,
    windowEndMs,
    nowIso,
    newId,
    recentForDedup = 5,
  } = deps;

  // 1. Collect every signal, best-effort.
  const signals: Signal[] = [];
  for (const c of collectors) {
    try {
      signals.push(await c.collect(windowStartMs, windowEndMs));
    } catch (e) {
      signals.push({ kind: "clipboard", ok: false, error: String(e) });
    }
  }

  // 2. Fuse.
  const ctx = buildContext(signals);
  if (ctx.signalsUsed.length === 0) return null; // nothing to talk about

  // 3. Dedup against recent drafts.
  // Use raw signal texts (without section headers) for comparison against stored one-line contexts.
  const rawText = signals
    .filter((s) => s.ok && s.text)
    .map((s) => s.text as string)
    .join(" ");
  const recent = store.recentDrafts(recentForDedup).map((d) => d.context);
  if (rawText && isNearDuplicate(rawText, recent)) return null;

  // 4. Generate.
  const persona = store.getSettings().persona;
  const swipeExamples = store.topSwipe(5);
  const gen = await generator.generate(ctx, { persona, swipeExamples });
  if (!gen.interesting) return null;

  // 5. Store as a pending draft.
  const draft: Draft = {
    id: newId(),
    createdAt: nowIso(),
    status: "pending",
    context: gen.context,
    why: gen.why,
    imagePath: ctx.imagePath,
    content: {
      twitter: gen.x_thread,
      linkedin: gen.linkedin,
      threads: gen.threads,
      instagram: gen.instagram,
      facebook: gen.facebook,
    },
  };
  store.insertDraft(draft);
  return draft;
}
