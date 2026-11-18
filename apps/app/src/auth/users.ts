import type { Provider, ProviderProfile } from "./providers";

export interface User {
  id: string;
  name: string;
  avatarUrl: string | null;
  disabled: boolean;
}

type Row = { id: string; name: string; avatar_url: string | null; disabled: number };
const toUser = (row: Row): User => ({
  id: row.id,
  name: row.name,
  avatarUrl: row.avatar_url,
  disabled: row.disabled === 1,
});

/** Crea el Dueño la primera vez que entra y actualiza su nombre, correo y foto las siguientes. */
export async function upsertUser(db: D1Database, provider: Provider, profile: ProviderProfile): Promise<User> {
  const now = Date.now();
  const row = await db
    .prepare(
      `INSERT INTO users (id, provider, provider_id, name, email, avatar_url, created_at, last_login_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (provider, provider_id) DO UPDATE SET
         name = excluded.name, email = excluded.email, avatar_url = excluded.avatar_url,
         last_login_at = excluded.last_login_at
       RETURNING id, name, avatar_url, disabled`,
    )
    .bind(crypto.randomUUID(), provider, profile.id, profile.name, profile.email, profile.avatarUrl, now, now)
    .first<Row>();
  if (!row) throw new Error("No se pudo guardar el usuario");
  return toUser(row);
}

export async function findUser(db: D1Database, id: string): Promise<User | null> {
  const row = await db.prepare("SELECT id, name, avatar_url, disabled FROM users WHERE id = ?").bind(id).first<Row>();
  return row ? toUser(row) : null;
}
