-- Las Claves para Agentes de cada Dueño (#7). La clave se muestra una sola
-- vez, al crearla: aquí queda solo su hash SHA-256, que basta para
-- reconocerla porque es larga y al azar. Revocar una clave borra su fila.
CREATE TABLE agent_keys (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users (id),
  name TEXT NOT NULL,
  hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER
);
CREATE INDEX agent_keys_owner ON agent_keys (owner_id, created_at);
