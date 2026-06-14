export const VERSION = "0.1.0";

export type Platform =
  | "twitter"
  | "linkedin"
  | "threads"
  | "instagram"
  | "facebook";

export const ALL_PLATFORMS: Platform[] = [
  "twitter",
  "linkedin",
  "threads",
  "instagram",
  "facebook",
];

export type SignalKind = "screenshot" | "transcript" | "gitFiles" | "clipboard";

/** Output of a single collector for one time window. */
export interface Signal {
  kind: SignalKind;
  ok: boolean;
  /** Absolute path to a captured screenshot (screenshot collector only). */
  imagePath?: string;
  /** Text digest for transcript / gitFiles / clipboard collectors. */
  text?: string;
  /** Error message when ok === false. */
  error?: string;
}

/** Fused, token-budgeted context handed to the generator. */
export interface FusedContext {
  /** Screenshot path to send as a vision block, if any. */
  imagePath?: string;
  /** Combined text digest from all text-producing signals. */
  text: string;
  /** Which signal kinds actually contributed (ok && content present). */
  signalsUsed: SignalKind[];
}

/** Per-platform draft content. twitter is a thread (1+ tweets). */
export interface DraftContent {
  twitter: string[];
  linkedin: string;
  threads: string;
  instagram: string;
  facebook: string;
}

export type DraftStatus = "pending" | "posted" | "rejected" | "error" | "failed";

export interface Draft {
  id: string;
  createdAt: string; // ISO 8601
  status: DraftStatus;
  context: string; // one-line summary
  why: string; // which signals drove this post
  imagePath?: string;
  content: DraftContent;
  error?: string;
  /** Per-platform publish outcome, set after a publish attempt. */
  publishResult?: PublishResult;
}

export interface PublishResult {
  perPlatform: Record<string, { ok: boolean; error?: string }>;
}

/** What the Claude generator returns (validated against the JSON schema). */
export interface GeneratedDraft {
  interesting: boolean;
  x_thread: string[];
  linkedin: string;
  threads: string;
  instagram: string;
  facebook: string;
  context: string;
  why: string;
}

export interface SwipeEntry {
  id: string;
  date: string;
  tweet: string;
  platform: string;
  likes: number;
  comments: number;
  retweets: number;
  impressions: number;
  note: string;
}

export interface ClipItem {
  id: string;
  kind: "image" | "text";
  createdAt: string; // ISO
  sourceApp: string;
  textContent?: string;
  imagePath?: string;
  hash: string;
}

export interface Settings {
  intervalMinutes: number;
  dailyCap: number;
  enabledSignals: Record<SignalKind, boolean>;
  enabledPlatforms: Record<Platform, boolean>;
  watchedFolders: string[];
  persona: string;
  blotatoAccountIds: Partial<Record<Platform, string>>;
  facebookPageId: string;
}

export const DEFAULT_PERSONA =
  'You are a "build in public" content writer for Andy (AI Andy), a creator who builds AI automations and apps using Claude Code.';

export const DEFAULT_SETTINGS: Settings = {
  intervalMinutes: 60,
  dailyCap: 6,
  enabledSignals: {
    screenshot: true,
    transcript: true,
    gitFiles: true,
    clipboard: true,
  },
  enabledPlatforms: {
    twitter: true,
    linkedin: true,
    threads: true,
    instagram: true,
    facebook: true,
  },
  watchedFolders: [],
  persona: DEFAULT_PERSONA,
  blotatoAccountIds: {},
  facebookPageId: "",
};
