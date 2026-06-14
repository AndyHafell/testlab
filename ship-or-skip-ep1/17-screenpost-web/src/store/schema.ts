export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL,
  context TEXT NOT NULL,
  why TEXT NOT NULL,
  image_path TEXT,
  content_json TEXT NOT NULL,
  error TEXT,
  publish_json TEXT
);

CREATE TABLE IF NOT EXISTS swipe (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  tweet TEXT NOT NULL,
  platform TEXT NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  retweets INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS clips (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  created_at TEXT NOT NULL,
  source_app TEXT NOT NULL DEFAULT '',
  text_content TEXT,
  image_path TEXT,
  hash TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_drafts_status ON drafts(status);
CREATE INDEX IF NOT EXISTS idx_drafts_created ON drafts(created_at);
CREATE INDEX IF NOT EXISTS idx_clips_created ON clips(created_at);
`;
