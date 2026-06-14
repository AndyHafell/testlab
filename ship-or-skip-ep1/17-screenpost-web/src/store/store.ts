import Database from "better-sqlite3";
import { SCHEMA_SQL } from "./schema";
import type {
  Draft,
  DraftStatus,
  PublishResult,
  SwipeEntry,
  ClipItem,
  Settings,
} from "../domain/types";
import { DEFAULT_SETTINGS } from "../domain/types";
import { topByEngagement } from "../domain/engagement";

interface DraftRow {
  id: string;
  created_at: string;
  status: string;
  context: string;
  why: string;
  image_path: string | null;
  content_json: string;
  error: string | null;
  publish_json: string | null;
}

export class Store {
  readonly db: Database.Database;

  constructor(path = ":memory:") {
    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(SCHEMA_SQL);
  }

  close(): void {
    this.db.close();
  }

  insertDraft(d: Draft): void {
    this.db
      .prepare(
        `INSERT INTO drafts (id, created_at, status, context, why, image_path, content_json, error, publish_json)
         VALUES (@id, @created_at, @status, @context, @why, @image_path, @content_json, @error, @publish_json)`,
      )
      .run({
        id: d.id,
        created_at: d.createdAt,
        status: d.status,
        context: d.context,
        why: d.why,
        image_path: d.imagePath ?? null,
        content_json: JSON.stringify(d.content),
        error: d.error ?? null,
        publish_json: d.publishResult ? JSON.stringify(d.publishResult) : null,
      });
  }

  getDraft(id: string): Draft | undefined {
    const row = this.db
      .prepare("SELECT * FROM drafts WHERE id = ?")
      .get(id) as DraftRow | undefined;
    return row ? rowToDraft(row) : undefined;
  }

  listDrafts(status?: DraftStatus): Draft[] {
    const rows = status
      ? (this.db
          .prepare(
            "SELECT * FROM drafts WHERE status = ? ORDER BY created_at DESC",
          )
          .all(status) as DraftRow[])
      : (this.db
          .prepare("SELECT * FROM drafts ORDER BY created_at DESC")
          .all() as DraftRow[]);
    return rows.map(rowToDraft);
  }

  recentDrafts(limit: number): Draft[] {
    const rows = this.db
      .prepare("SELECT * FROM drafts ORDER BY created_at DESC LIMIT ?")
      .all(limit) as DraftRow[];
    return rows.map(rowToDraft);
  }

  setDraftStatus(id: string, status: DraftStatus): void {
    this.db.prepare("UPDATE drafts SET status = ? WHERE id = ?").run(status, id);
  }

  setDraftError(id: string, error: string): void {
    this.db
      .prepare("UPDATE drafts SET status = 'error', error = ? WHERE id = ?")
      .run(error, id);
  }

  setDraftContent(id: string, content: Draft["content"]): void {
    this.db
      .prepare("UPDATE drafts SET content_json = ? WHERE id = ?")
      .run(JSON.stringify(content), id);
  }

  setDraftPublishResult(id: string, result: PublishResult): void {
    this.db
      .prepare("UPDATE drafts SET publish_json = ? WHERE id = ?")
      .run(JSON.stringify(result), id);
  }

  // --- swipe ---
  addSwipe(e: SwipeEntry): void {
    this.db
      .prepare(
        `INSERT INTO swipe (id, date, tweet, platform, likes, comments, retweets, impressions, note)
         VALUES (@id, @date, @tweet, @platform, @likes, @comments, @retweets, @impressions, @note)`,
      )
      .run(e);
  }

  listSwipe(): SwipeEntry[] {
    return this.db
      .prepare("SELECT * FROM swipe ORDER BY date DESC")
      .all() as SwipeEntry[];
  }

  topSwipe(n: number): SwipeEntry[] {
    return topByEngagement(this.listSwipe(), n);
  }

  updateSwipe(id: string, patch: Partial<Omit<SwipeEntry, "id">>): void {
    const current = this.db
      .prepare("SELECT * FROM swipe WHERE id = ?")
      .get(id) as SwipeEntry | undefined;
    if (!current) return;
    const next = { ...current, ...patch, id };
    this.db
      .prepare(
        `UPDATE swipe SET date=@date, tweet=@tweet, platform=@platform, likes=@likes,
         comments=@comments, retweets=@retweets, impressions=@impressions, note=@note WHERE id=@id`,
      )
      .run(next);
  }

  removeSwipe(id: string): void {
    this.db.prepare("DELETE FROM swipe WHERE id = ?").run(id);
  }

  // --- clips ---
  addClip(c: ClipItem): void {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO clips (id, kind, created_at, source_app, text_content, image_path, hash)
         VALUES (@id, @kind, @created_at, @source_app, @text_content, @image_path, @hash)`,
      )
      .run({
        id: c.id,
        kind: c.kind,
        created_at: c.createdAt,
        source_app: c.sourceApp,
        text_content: c.textContent ?? null,
        image_path: c.imagePath ?? null,
        hash: c.hash,
      });
  }

  hasClipHash(hash: string): boolean {
    const row = this.db
      .prepare("SELECT 1 FROM clips WHERE hash = ?")
      .get(hash);
    return row !== undefined;
  }

  listClips(limit: number, offset: number): ClipItem[] {
    const rows = this.db
      .prepare(
        "SELECT * FROM clips ORDER BY created_at DESC LIMIT ? OFFSET ?",
      )
      .all(limit, offset) as Array<{
      id: string;
      kind: string;
      created_at: string;
      source_app: string;
      text_content: string | null;
      image_path: string | null;
      hash: string;
    }>;
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind as ClipItem["kind"],
      createdAt: r.created_at,
      sourceApp: r.source_app,
      textContent: r.text_content ?? undefined,
      imagePath: r.image_path ?? undefined,
      hash: r.hash,
    }));
  }

  // --- meta / settings ---
  getMeta(key: string): string | undefined {
    const row = this.db
      .prepare("SELECT value FROM meta WHERE key = ?")
      .get(key) as { value: string } | undefined;
    return row?.value;
  }

  setMeta(key: string, value: string): void {
    this.db
      .prepare(
        "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      )
      .run(key, value);
  }

  getSettings(): Settings {
    const raw = this.getMeta("settings");
    if (!raw) return { ...DEFAULT_SETTINGS };
    const stored = JSON.parse(raw) as Partial<Settings>;
    // Deep-merge the nested object fields so a persisted partial (e.g. from an
    // older schema missing a signal/platform key) keeps the current defaults.
    return {
      ...DEFAULT_SETTINGS,
      ...stored,
      enabledSignals: { ...DEFAULT_SETTINGS.enabledSignals, ...(stored.enabledSignals ?? {}) },
      enabledPlatforms: { ...DEFAULT_SETTINGS.enabledPlatforms, ...(stored.enabledPlatforms ?? {}) },
      blotatoAccountIds: { ...DEFAULT_SETTINGS.blotatoAccountIds, ...(stored.blotatoAccountIds ?? {}) },
    };
  }

  setSettings(patch: Partial<Settings>): void {
    const next = { ...this.getSettings(), ...patch };
    this.setMeta("settings", JSON.stringify(next));
  }
}

function rowToDraft(r: DraftRow): Draft {
  return {
    id: r.id,
    createdAt: r.created_at,
    status: r.status as DraftStatus,
    context: r.context,
    why: r.why,
    imagePath: r.image_path ?? undefined,
    content: JSON.parse(r.content_json),
    error: r.error ?? undefined,
    publishResult: r.publish_json ? JSON.parse(r.publish_json) : undefined,
  };
}
