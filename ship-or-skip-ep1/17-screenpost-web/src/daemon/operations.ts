import { randomUUID } from "node:crypto";
import type { Store } from "../store/store";
import type { Generator } from "../generate/generator";
import type { Publisher } from "../publish/publisher";
import type { Collector } from "../collectors/collector";
import { Scheduler, type SchedulerState } from "../schedule/scheduler";
import { runPass } from "../pipeline/runPass";
import type { Draft, Platform, PublishResult, FusedContext } from "../domain/types";
import { ALL_PLATFORMS } from "../domain/types";

export interface OperationsDeps {
  store: Store;
  generator: Generator;
  publisher: Publisher;
  scheduler: Scheduler;
  collectors: Collector[];
  now?: () => number;
}

export interface Operations {
  runPassNow(): Promise<Draft | null>;
  regenerate(draft: Draft, feedback: string): Promise<Draft>;
  publishDraft(draft: Draft): Promise<PublishResult>;
  generateFromClip(clipId: string): Promise<Draft | null>;
}

function today(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

function loadSchedState(store: Store): SchedulerState {
  const raw = store.getMeta("scheduler");
  return raw ? JSON.parse(raw) : { lastRunMs: 0, postsToday: 0, postsDate: "" };
}

function saveSchedState(store: Store, state: SchedulerState & { paused?: boolean }): void {
  const prev = store.getMeta("scheduler");
  const paused = prev ? JSON.parse(prev).paused ?? false : false;
  store.setMeta("scheduler", JSON.stringify({ ...state, paused }));
}

export function createOperations(deps: OperationsDeps): Operations {
  const { store, generator, publisher, scheduler, collectors } = deps;
  const now = deps.now ?? (() => Date.now());

  async function runPassNow(): Promise<Draft | null> {
    const end = now();
    return runPass({
      store,
      collectors,
      generator,
      windowStartMs: end - 60 * 60 * 1000,
      windowEndMs: end,
      nowIso: () => new Date(end).toISOString(),
      newId: () => randomUUID(),
    });
  }

  async function regenerate(draft: Draft, feedback: string): Promise<Draft> {
    const ctx: FusedContext = {
      imagePath: draft.imagePath,
      text: `${draft.context}\n\nUser feedback for rewrite: ${feedback}`,
      signalsUsed: ["transcript"],
    };
    const gen = await generator.generate(ctx, {
      persona: store.getSettings().persona,
      swipeExamples: store.topSwipe(5),
    });
    return {
      ...draft,
      content: {
        twitter: gen.x_thread,
        linkedin: gen.linkedin,
        threads: gen.threads,
        instagram: gen.instagram,
        facebook: gen.facebook,
      },
    };
  }

  async function publishDraft(draft: Draft): Promise<PublishResult> {
    const enabled = store.getSettings().enabledPlatforms;
    const platforms = ALL_PLATFORMS.filter((p: Platform) => enabled[p]);
    const result = await publisher.publish(draft, platforms);
    const nowMs = now();
    saveSchedState(store, scheduler.recordPost(loadSchedState(store), nowMs, today(nowMs)));
    return result;
  }

  async function generateFromClip(clipId: string): Promise<Draft | null> {
    const clip = store.listClips(1000, 0).find((c) => c.id === clipId);
    if (!clip) return null;
    const ctx: FusedContext = {
      imagePath: clip.imagePath,
      text: clip.textContent ? `clipboard: ${clip.textContent}` : "clipboard image",
      signalsUsed: clip.imagePath ? ["screenshot"] : ["clipboard"],
    };
    const gen = await generator.generate(ctx, {
      persona: store.getSettings().persona,
      swipeExamples: store.topSwipe(5),
    });
    if (!gen.interesting) return null;
    const draft: Draft = {
      id: randomUUID(),
      createdAt: new Date(now()).toISOString(),
      status: "pending",
      context: gen.context,
      why: gen.why,
      imagePath: clip.imagePath,
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

  return { runPassNow, regenerate, publishDraft, generateFromClip };
}
