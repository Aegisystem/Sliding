import { type DeckKind, type SlideInfo, inspectDeck, isPdf, newDeckId, pdfPageCount } from "@sliding/core";
import { nextPosition, ownFolder } from "../folders/store";
import type { Limits } from "./limits";

export type StoreError = "vacio" | "formato" | "no-pdf" | "muy-grande" | "cupo-espacio" | "no-existe";
export type StoreResult = { ok: true; id: string } | { ok: false; error: StoreError };

export interface DeckRow {
  id: string;
  title: string;
  kind: DeckKind;
  size: number;
  slideCount: number | null;
  /** Solo en una Presentación en PDF: cuántas diapositivas traían las notas del .pptx, o null sin notas. */
  notesCount: number | null;
  presentSecret: string;
  updatedAt: number;
  /** 1 si el administrador la desactivó (#11): nadie puede verla ni presentarla. */
  disabled: number;
  /** 1 si está oculta (#23): no aparece en el Enlace de la carpeta. */
  hidden: number;
}

/** Lo que el Enlace de la carpeta muestra de cada presentación: nada secreto. */
export type PublicDeck = Pick<DeckRow, "id" | "title" | "kind" | "slideCount" | "updatedAt">;

export interface Usage {
  decks: number;
  bytes: number;
}

const HTML_FILE = /\.html?$/i;
const PDF_FILE = /\.pdf$/i;

/** El formato lo dice el nombre o, si no, el tipo que manda el navegador. */
function formatOf(file: File): "html" | "pdf" | null {
  if (HTML_FILE.test(file.name)) return "html";
  if (PDF_FILE.test(file.name)) return "pdf";
  if (file.type === "text/html") return "html";
  if (file.type === "application/pdf") return "pdf";
  return null;
}

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

/** Las presentaciones de una carpeta (o de la raíz, con null), en el orden que les dio el Dueño. */
export async function listDecks(db: D1Database, ownerId: string, folderId: string | null = null): Promise<DeckRow[]> {
  const { results } = await db
    .prepare(
      `SELECT id, title, kind, size, slide_count AS slideCount, notes_count AS notesCount,
              present_secret AS presentSecret, updated_at AS updatedAt, disabled, hidden
       FROM decks WHERE owner_id = ? AND folder_id IS ?
       ORDER BY position IS NULL, position, created_at DESC`,
    )
    .bind(ownerId, folderId)
    .all<DeckRow>();
  return results;
}

/** Las presentaciones de una carpeta que ve quien tiene su enlace: sin las desactivadas ni las ocultas (#23). */
export async function listPublicDecks(db: D1Database, ownerId: string, folderId: string): Promise<PublicDeck[]> {
  const { results } = await db
    .prepare(
      `SELECT id, title, kind, slide_count AS slideCount, updated_at AS updatedAt
       FROM decks WHERE owner_id = ? AND folder_id = ? AND disabled = 0 AND hidden = 0
       ORDER BY position IS NULL, position, created_at DESC`,
    )
    .bind(ownerId, folderId)
    .all<PublicDeck>();
  return results;
}

/**
 * Cuántas presentaciones hay en cada carpeta del Dueño (la raíz va con la
 * clave ""). Para el Enlace de la carpeta se cuentan solo las que se ven.
 */
export async function deckCounts(db: D1Database, ownerId: string, { visibleOnly = false } = {}): Promise<Map<string, number>> {
  const { results } = await db
    .prepare(
      `SELECT COALESCE(folder_id, '') AS folder, COUNT(*) AS n FROM decks
       WHERE owner_id = ? ${visibleOnly ? "AND disabled = 0 AND hidden = 0" : ""} GROUP BY folder_id`,
    )
    .bind(ownerId)
    .all<{ folder: string; n: number }>();
  return new Map(results.map((r) => [r.folder, r.n]));
}

/** Lo que se guarda de un archivo, ya revisado. */
interface Prepared {
  kind: DeckKind;
  title: string;
  slideCount: number | null;
  body: string | Uint8Array;
  /** Las notas para el Control: del HTML en html-slides, del .pptx en un PDF. */
  slides: SlideInfo[] | null;
}

async function prepare(file: File, format: "html" | "pdf", notes: SlideInfo[] | null): Promise<Prepared | "no-pdf"> {
  if (format === "pdf") {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isPdf(bytes)) return "no-pdf";
    const title = file.name.replace(PDF_FILE, "").trim() || "Sin título";
    return { kind: "pdf", title, slideCount: pdfPageCount(bytes), body: bytes, slides: notes };
  }
  const html = await file.text();
  const info = await inspectDeck(html);
  const title = info.title ?? (file.name.replace(HTML_FILE, "").trim() || "Sin título");
  return { kind: info.kind, title, slideCount: info.slideCount, body: html, slides: info.slides };
}

/**
 * Guarda un deck nuevo, o reemplaza uno del Dueño si viene `deckId` (Q14: el
 * archivo anterior se borra y el enlace se mantiene). Lo usan el panel y la
 * API de Agentes. `notes` son las notas del .pptx de una Presentación en PDF;
 * si un PDF reemplaza a otro sin notas nuevas, se quedan las que tenía.
 */
export async function storeDeck(
  env: Cloudflare.Env,
  limits: Limits,
  {
    ownerId,
    file,
    deckId,
    folderId = null,
    notes = null,
  }: { ownerId: string; file: File; deckId?: string; folderId?: string | null; notes?: SlideInfo[] | null },
): Promise<StoreResult> {
  if (file.size === 0) return { ok: false, error: "vacio" };
  const format = formatOf(file);
  if (!format) return { ok: false, error: "formato" };
  if (file.size > limits.deckBytes) return { ok: false, error: "muy-grande" };
  if (folderId && !(await ownFolder(env.DB, ownerId, folderId))) return { ok: false, error: "no-existe" };

  const current = await usage(env.DB, ownerId);
  let previous: { size: number; kind: DeckKind; notesCount: number | null } | null = null;
  if (deckId) {
    previous = await env.DB.prepare("SELECT size, kind, notes_count AS notesCount FROM decks WHERE id = ? AND owner_id = ?")
      .bind(deckId, ownerId)
      .first();
    if (!previous) return { ok: false, error: "no-existe" };
  }
  if (current.bytes - (previous?.size ?? 0) + file.size > limits.bytesPerOwner) return { ok: false, error: "cupo-espacio" };

  const deck = await prepare(file, format, notes);
  if (deck === "no-pdf") return { ok: false, error: "no-pdf" };
  const id = deckId ?? newDeckId();
  const now = Date.now();
  const keepNotes = deck.kind === "pdf" && !deck.slides && previous?.kind === "pdf";
  const notesCount = deck.kind !== "pdf" ? null : deck.slides ? deck.slides.length : keepNotes ? (previous?.notesCount ?? null) : null;

  // Primero los archivos: una fila en D1 nunca apunta a una presentación que falta.
  // `notes:<id>` guarda el título y las notas de cada diapositiva, solo para el Control.
  await env.DECKS.put(`deck:${id}`, deck.body);
  if (deck.slides) await env.DECKS.put(`notes:${id}`, JSON.stringify(deck.slides));
  else if (!keepNotes) await env.DECKS.delete(`notes:${id}`);

  if (deckId) {
    await env.DB.prepare(
      "UPDATE decks SET title = ?, kind = ?, size = ?, slide_count = ?, notes_count = ?, updated_at = ? WHERE id = ? AND owner_id = ?",
    )
      .bind(deck.title, deck.kind, file.size, deck.slideCount, notesCount, now, id, ownerId)
      .run();
  } else {
    await env.DB.prepare(
      // Lo nuevo llega oculto: el Dueño lo muestra en su carpeta cuando quiere (#23).
      `INSERT INTO decks (id, owner_id, title, kind, size, slide_count, notes_count, present_secret, folder_id, position, disabled, hidden, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)`,
    )
      .bind(
        id,
        ownerId,
        deck.title,
        deck.kind,
        file.size,
        deck.slideCount,
        notesCount,
        newPresentSecret(),
        folderId,
        await nextPosition(env.DB, "decks", ownerId, folderId),
        now,
        now,
      )
      .run();
  }
  return { ok: true, id };
}

/**
 * «Agregar notas»: guarda las notas del .pptx de una Presentación en PDF del
 * Dueño. No cambia el PDF, así que tampoco su fecha.
 */
export async function saveNotes(env: Cloudflare.Env, ownerId: string, deckId: string, notes: SlideInfo[]): Promise<boolean> {
  const deck = await env.DB.prepare("SELECT kind FROM decks WHERE id = ? AND owner_id = ?")
    .bind(deckId, ownerId)
    .first<{ kind: DeckKind }>();
  if (deck?.kind !== "pdf") return false;
  await env.DECKS.put(`notes:${deckId}`, JSON.stringify(notes));
  await env.DB.prepare("UPDATE decks SET notes_count = ? WHERE id = ? AND owner_id = ?").bind(notes.length, deckId, ownerId).run();
  return true;
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

/** Muestra u oculta una presentación del Dueño en el Enlace de su carpeta (#23). False si no es suya. */
export async function setDeckHidden(db: D1Database, ownerId: string, id: string, hidden: boolean): Promise<boolean> {
  const { meta } = await db
    .prepare("UPDATE decks SET hidden = ? WHERE id = ? AND owner_id = ?")
    .bind(hidden ? 1 : 0, id, ownerId)
    .run();
  return meta.changes > 0;
}
