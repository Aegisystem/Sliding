-- Datos de cada deck. El HTML vive en KV con la llave `deck:<id>` (ADR 0002).
CREATE TABLE decks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('html-slides', 'generic')),
  size INTEGER NOT NULL,
  disabled INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
