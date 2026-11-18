-- Cada Dueño, identificado por su cuenta en GitHub o Google. La misma
-- persona entrando con los dos proveedores son dos Dueños distintos.
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('github', 'google')),
  provider_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  disabled INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_login_at INTEGER NOT NULL,
  UNIQUE (provider, provider_id)
);
