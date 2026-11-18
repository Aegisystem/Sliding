import { type DeckKind, inspectDeck, newDeckId } from "@sliding/core";
import type { Limits } from "./limits";

export type StoreError = "vacio" | "no-html" | "muy-grande" | "cupo-espacio" | "no-existe";
export type StoreResult = { ok: true; id: string } | { ok: false; error: StoreError };

export interface DeckRow {
  id: string;
  title: string;
  kind: DeckKind;
  size: number;
  slideCount: number | null;
  presentSecret: string;
  updatedAt: number;
}

export interface Usage {
  decks: number;
  bytes: number;
}

const HTML_FILE = /\.html?$/i;

/** Secreto del Enlace para presentar: 128 bits en base64url. */
export function newPresentSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const isPresentSecret = (value: string) => /^[A-Za-z0-9_-]{22}$/.test(value);

export async function usage(db: D1Database, ownerId: string): Promise<Usage> {
  const row = await db
    .prepare("SELECT COUNT(*) AS decks, COALESCE(SUM(size), 0) AS bytes FROM decks WHERE owner_id = ?")
    .bind(ownerId)
    .first<Usage>();
  return row ?? { decks: 0, bytes: 0 };
}

export async function listDecks(db: D1Database, ownerId: string): Promise<DeckRow[]> {
  const { results } = await db
    .prepare(
      `SELECT id, title, kind, size, slide_count AS slideCount, present_secret AS presentSecret, updated_at AS updatedAt
       FROM decks WHERE owner_id = ? ORDER BY updated_at DESC`,
    )
    .bind(ownerId)
    .all<DeckRow>();
  return results;
}

/**
 * Guarda un deck nuevo, o reemplaza uno del Dueño si viene `deckId` (Q14: el
 * archivo anterior se borra y el enlace se mantiene). Lo usan el panel y la
 * API de Agentes.
 */
export async function storeDeck(
  env: Cloudflare.Env,
  limits: Limits,
  { ownerId, file, deckId }: { ownerId: string; file: File; deckId?: string },
): Promise<StoreResult> {
  if (file.size === 0) return { ok: false, error: "vacio" };
  if (!HTML_FILE.test(file.name) && file.type !== "text/html") return { ok: false, error: "no-html" };
  if (file.size > limits.deckBytes) return { ok: false, error: "muy-grande" };

  const current = await usage(env.DB, ownerId);
  let previousSize = 0;
  if (deckId) {
    const existing = await env.DB.prepare("SELECT size FROM decks WHERE id = ? AND owner_id = ?")
      .bind(deckId, ownerId)
      .first<{ size: number }>();
    if (!existing) return { ok: false, error: "no-existe" };
    previousSize = existing.size;
  }
  if (current.bytes - previousSize + file.size > limits.bytesPerOwner) return { ok: false, error: "cupo-espacio" };

  const html = await file.text();
  const info = await inspectDeck(html);
  const title = info.title ?? (file.name.replace(HTML_FILE, "").trim() || "Sin título");
  const id = deckId ?? newDeckId();
  const now = Date.now();

  // Primero los archivos: una fila en D1 nunca apunta a un deck que falta.
  await env.DECKS.put(`deck:${id}`, html);
  if (info.notes) await env.DECKS.put(`notes:${id}`, JSON.stringify(info.notes));
  else await env.DECKS.delete(`notes:${id}`);

  if (deckId) {
    await env.DB.prepare(
      "UPDATE decks SET title = ?, kind = ?, size = ?, slide_count = ?, updated_at = ? WHERE id = ? AND owner_id = ?",
    )
      .bind(title, info.kind, file.size, info.slideCount, now, id, ownerId)
      .run();
  } else {
    await env.DB.prepare(
      `INSERT INTO decks (id, owner_id, title, kind, size, slide_count, present_secret, disabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    )
      .bind(id, ownerId, title, info.kind, file.size, info.slideCount, newPresentSecret(), now, now)
      .run();
  }
  return { ok: true, id };
}

/** Borra un deck del Dueño: su fila, su archivo y sus notas. El enlace deja de funcionar. */
export async function deleteDeck(env: Cloudflare.Env, ownerId: string, deckId: string): Promise<boolean> {
  const deleted = await env.DB.prepare("DELETE FROM decks WHERE id = ? AND owner_id = ? RETURNING id")
    .bind(deckId, ownerId)
    .first<{ id: string }>();
  if (!deleted) return false;
  await Promise.all([env.DECKS.delete(`deck:${deckId}`), env.DECKS.delete(`notes:${deckId}`)]);
  return true;
}
