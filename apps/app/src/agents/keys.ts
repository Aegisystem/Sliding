import { isDeckId, newDeckId, randomText } from "@sliding/core";
import { cleanName } from "../folders/store";

// Claves para Agentes (#7): un Agente sube presentaciones a nombre de un
// Dueño con una de sus claves. Sliding la muestra una sola vez y guarda solo
// su hash.

/** Las claves que puede tener un Dueño a la vez. */
export const MAX_KEYS = 20;

const PREFIX = "sliding_";
const KEY_LENGTH = 40;
const KEY = new RegExp(`^${PREFIX}[A-Za-z0-9]{${KEY_LENGTH}}$`);

/** El id de una clave tiene el formato del de una presentación; aparece en la ruta para revocarla. */
export const isKeyId = isDeckId;

export interface AgentKey {
  id: string;
  name: string;
  createdAt: number;
  lastUsedAt: number | null;
}

export type KeyError = "nombre" | "limite";

async function hashOf(key: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Crea una clave. Devuelve la clave completa: es la única vez que existe fuera del navegador del Dueño. */
export async function createKey(
  db: D1Database,
  ownerId: string,
  rawName: unknown,
): Promise<{ ok: true; key: string; name: string } | { ok: false; error: KeyError }> {
  const name = cleanName(rawName);
  if (!name) return { ok: false, error: "nombre" };
  const key = `${PREFIX}${randomText(KEY_LENGTH)}`;
  // El límite se revisa en el mismo INSERT: dos pedidos a la vez no lo pasan.
  const { meta } = await db
    .prepare(
      `INSERT INTO agent_keys (id, owner_id, name, hash, created_at)
       SELECT ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM agent_keys WHERE owner_id = ?) < ?`,
    )
    .bind(newDeckId(), ownerId, name, await hashOf(key), Date.now(), ownerId, MAX_KEYS)
    .run();
  return meta.changes ? { ok: true, key, name } : { ok: false, error: "limite" };
}

/** Las claves del Dueño, la más nueva primero. Sin la clave: Sliding ya no la tiene. */
export async function listKeys(db: D1Database, ownerId: string): Promise<AgentKey[]> {
  const { results } = await db
    .prepare(
      `SELECT id, name, created_at AS createdAt, last_used_at AS lastUsedAt FROM agent_keys
       WHERE owner_id = ? ORDER BY created_at DESC, rowid DESC`,
    )
    .bind(ownerId)
    .all<AgentKey>();
  return results;
}

/** Revoca una clave del Dueño. false si no existe o es de otro. */
export async function revokeKey(db: D1Database, ownerId: string, id: string): Promise<boolean> {
  const { meta } = await db.prepare("DELETE FROM agent_keys WHERE id = ? AND owner_id = ?").bind(id, ownerId).run();
  return meta.changes > 0;
}

/**
 * El id del Dueño de la clave, o null si no existe, la revocaron o su Dueño
 * está desactivado. Anota que se usó ahora.
 */
export async function ownerOfKey(db: D1Database, key: string | null | undefined): Promise<string | null> {
  if (!key || !KEY.test(key)) return null;
  const row = await db
    .prepare(
      `UPDATE agent_keys SET last_used_at = ?
       WHERE hash = ? AND owner_id IN (SELECT id FROM users WHERE disabled = 0)
       RETURNING owner_id AS ownerId`,
    )
    .bind(Date.now(), await hashOf(key))
    .first<{ ownerId: string }>();
  return row?.ownerId ?? null;
}
