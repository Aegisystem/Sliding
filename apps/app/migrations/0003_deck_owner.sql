-- Cada deck pertenece a un Dueño y tiene su Enlace para presentar secreto.
-- Los decks de prueba de `npm run seed` quedan sin dueño.
ALTER TABLE decks ADD COLUMN owner_id TEXT REFERENCES users (id);
ALTER TABLE decks ADD COLUMN present_secret TEXT;
ALTER TABLE decks ADD COLUMN slide_count INTEGER;
CREATE UNIQUE INDEX decks_present_secret ON decks (present_secret);
CREATE INDEX decks_owner ON decks (owner_id, updated_at);
