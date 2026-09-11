CREATE TABLE IF NOT EXISTS page_views (
  day TEXT NOT NULL,
  table_id TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, table_id)
);
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  table_id TEXT NOT NULL,
  rules_version TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  duration_ms INTEGER,
  score INTEGER,
  excluded INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS games_started ON games(started_at);
CREATE INDEX IF NOT EXISTS games_scores ON games(table_id, rules_version, excluded, score DESC);
