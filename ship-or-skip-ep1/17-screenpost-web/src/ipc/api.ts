import type { Store } from "../store/store";
import type { SecretStore } from "../secrets/secrets";
import type { RendererApi, SchedulerStatus, ApproveResult } from "./contract";
import type { Draft, SwipeEntry } from "../domain/types";

export interface ApiDeps {
  store: Store;
  secrets: SecretStore;
  newId: () => string;
  nowIso: () => string;
  runPassNow: () => Promise<Draft | null>;
  regenerate: (draft: Draft, feedback: string) => Promise<Draft>;
  publishDraft: (draft: Draft) => Promise<ApproveResult["result"]>;
  generateFromClip: (clipId: string) => Promise<Draft | null>;
  scheduler: { status: () => SchedulerStatus; pause: () => void; resume: () => void };
}

export function createApi(deps: ApiDeps): RendererApi {
  const { store } = deps;
  return {
    async listQueue() {
      return store.listDrafts("pending");
    },

    async approve(id, edits) {
      const draft = store.getDraft(id);
      if (!draft) throw new Error(`draft ${id} not found`);
      if (edits) {
        const content = { ...draft.content, ...edits };
        store.setDraftContent(id, content);
        draft.content = content;
      }
      const result = await deps.publishDraft(draft);
      const allOk = Object.values(result.perPlatform).every((p) => p.ok);
      store.setDraftPublishResult(id, result);
      store.setDraftStatus(id, allOk ? "posted" : "failed");
      return { draft: store.getDraft(id)!, result };
    },

    async regenerate(id, feedback) {
      const draft = store.getDraft(id);
      if (!draft) throw new Error(`draft ${id} not found`);
      const updated = await deps.regenerate(draft, feedback);
      store.setDraftContent(id, updated.content);
      return store.getDraft(id)!;
    },

    async reject(id) {
      store.setDraftStatus(id, "rejected");
    },

    async generateNow() {
      return deps.runPassNow();
    },

    async listHistory() {
      return store
        .listDrafts()
        .filter((d) => d.status !== "pending");
    },

    async listSwipe() {
      return store.listSwipe();
    },

    async addSwipe(entry) {
      const created: SwipeEntry = { id: deps.newId(), ...entry };
      store.addSwipe(created);
      return created;
    },

    async updateSwipe(id, patch) {
      store.updateSwipe(id, patch);
    },

    async removeSwipe(id) {
      store.removeSwipe(id);
    },

    async listClips(page) {
      const pageSize = 24;
      return store.listClips(pageSize, page * pageSize);
    },

    async postClip(id) {
      return deps.generateFromClip(id);
    },

    async getSettings() {
      return store.getSettings();
    },

    async setSettings(patch) {
      store.setSettings(patch);
      return store.getSettings();
    },

    async setSecret(name, value) {
      deps.secrets.set(name, value);
    },

    async secretStatus() {
      return deps.secrets.status();
    },

    async schedulerStatus() {
      return deps.scheduler.status();
    },

    async pauseScheduler() {
      deps.scheduler.pause();
    },

    async resumeScheduler() {
      deps.scheduler.resume();
    },
  };
}
