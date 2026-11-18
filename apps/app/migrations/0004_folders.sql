-- Carpetas de un Dueño, anidadas sin límite. El id también es el Enlace de la carpeta.
CREATE TABLE folders (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users (id),
  parent_id TEXT REFERENCES folders (id),
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX folders_owner_parent ON folders (owner_id, parent_id, position);

-- Cada presentación está en una carpeta o en ninguna (NULL), en el orden que le dio su Dueño.
ALTER TABLE decks ADD COLUMN folder_id TEXT REFERENCES folders (id);
ALTER TABLE decks ADD COLUMN position INTEGER;
CREATE INDEX decks_owner_folder ON decks (owner_id, folder_id, position);
