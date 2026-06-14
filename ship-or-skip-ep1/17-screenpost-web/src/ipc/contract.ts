import type {
  Draft,
  DraftContent,
  PublishResult,
  SwipeEntry,
  ClipItem,
  Settings,
} from "../domain/types";

export interface SchedulerStatus {
  paused: boolean;
  minutesUntilNext: number;
  postsToday: number;
  dailyCap: number;
}

export interface ApproveResult {
  draft: Draft;
  result: PublishResult;
}

/** The exact surface exposed to the renderer as window.api. */
export interface RendererApi {
  listQueue(): Promise<Draft[]>;
  approve(id: string, edits?: Partial<DraftContent>): Promise<ApproveResult>;
  regenerate(id: string, feedback: string): Promise<Draft>;
  reject(id: string): Promise<void>;
  generateNow(): Promise<Draft | null>;
  listHistory(): Promise<Draft[]>;
  listSwipe(): Promise<SwipeEntry[]>;
  addSwipe(entry: Omit<SwipeEntry, "id">): Promise<SwipeEntry>;
  updateSwipe(id: string, patch: Partial<Omit<SwipeEntry, "id">>): Promise<void>;
  removeSwipe(id: string): Promise<void>;
  listClips(page: number): Promise<ClipItem[]>;
  postClip(id: string): Promise<Draft | null>;
  getSettings(): Promise<Settings>;
  setSettings(patch: Partial<Settings>): Promise<Settings>;
  setSecret(name: string, value: string): Promise<void>;
  secretStatus(): Promise<Record<string, boolean>>;
  schedulerStatus(): Promise<SchedulerStatus>;
  pauseScheduler(): Promise<void>;
  resumeScheduler(): Promise<void>;
}

/** Channel names = method names, shared by preload + register so they cannot drift. */
export const API_METHODS: (keyof RendererApi)[] = [
  "listQueue",
  "approve",
  "regenerate",
  "reject",
  "generateNow",
  "listHistory",
  "listSwipe",
  "addSwipe",
  "updateSwipe",
  "removeSwipe",
  "listClips",
  "postClip",
  "getSettings",
  "setSettings",
  "setSecret",
  "secretStatus",
  "schedulerStatus",
  "pauseScheduler",
  "resumeScheduler",
];
