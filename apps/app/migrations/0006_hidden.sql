-- Mostrar y ocultar lo que hay en una carpeta (#23). Lo oculto no aparece en
-- el Enlace de la carpeta. Lo que ya existía queda visible (0); lo nuevo lo
-- crea la app oculto (1).
ALTER TABLE decks ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;
ALTER TABLE folders ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;
