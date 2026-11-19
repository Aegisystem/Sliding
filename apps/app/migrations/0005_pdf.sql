-- Presentaciones en PDF (ADR 0004). SQLite no deja cambiar un CHECK, así que la
-- tabla se rehace con el tipo 'pdf' y con `notes_count`: cuántas diapositivas
-- traían las notas del .pptx (NULL si no se agregaron).
PRAGMA defer_foreign_keys = true;

CREATE TABLE decks_new (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('html-slides', 'generic', 'pdf')),
  size INTEGER NOT NULL,
  disabled INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  owner_id TEXT REFERENCES users (id),
  present_secret TEXT,
  slide_count INTEGER,
  folder_id TEXT REFERENCES folders (id),
  position INTEGER,
  notes_count INTEGER
);

INSERT INTO decks_new (id, title, kind, size, disabled, created_at, updated_at, owner_id, present_secret, slide_count, folder_id, position)
  SELECT id, title, kind, size, disabled, created_at, updated_at, owner_id, present_secret, slide_count, folder_id, position FROM decks;

DROP TABLE decks;
ALTER TABLE decks_new RENAME TO decks;

CREATE UNIQUE INDEX decks_present_secret ON decks (present_secret);
CREATE INDEX decks_owner ON decks (owner_id, updated_at);
CREATE INDEX decks_owner_folder ON decks (owner_id, folder_id, position);

PRAGMA defer_foreign_keys = false;
