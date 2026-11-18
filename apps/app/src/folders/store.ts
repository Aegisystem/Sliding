import { isDeckId, newDeckId } from "@sliding/core";

/** Las carpetas usan el mismo formato de id que las presentaciones: imposible de adivinar. */
export const isFolderId = isDeckId;

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  position: number;
}

export type FolderError = "nombre" | "no-existe" | "ciclo";

const MAX_NAME = 80;

/** El nombre limpio, o null si queda vacío o es demasiado largo. */
export function cleanName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.replace(/\s+/g, " ").trim();
  return name.length > 0 && name.length <= MAX_NAME ? name : null;
}

/** Todas las carpetas del Dueño: pocas, y hacen falta para la ruta y para «Mover a». */
export async function listFolders(db: D1Database, ownerId: string): Promise<Folder[]> {
  const { results } = await db
    .prepare(
      `SELECT id, name, parent_id AS parentId, position FROM folders
       WHERE owner_id = ? ORDER BY position, created_at`,
    )
    .bind(ownerId)
    .all<Folder>();
  return results;
}

/** La ruta desde la raíz hasta la carpeta, incluida. */
export function pathTo(folders: Folder[], id: string | null): Folder[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const path: Folder[] = [];
  let current = id ? byId.get(id) : undefined;
  while (current && path.length <= folders.length) {
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}

/** La carpeta y todas las que tiene dentro, a cualquier profundidad. */
export function descendantsOf(folders: Folder[], id: string): Set<string> {
  const found = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of folders) {
      if (f.parentId && found.has(f.parentId) && !found.has(f.id)) {
        found.add(f.id);
        grew = true;
      }
    }
  }
  return found;
}

async function nextPosition(db: D1Database, table: "folders" | "decks", ownerId: string, parentId: string | null) {
  const column = table === "folders" ? "parent_id" : "folder_id";
  const row = await db
    .prepare(`SELECT COALESCE(MAX(position), -1) + 1 AS next FROM ${table} WHERE owner_id = ? AND ${column} IS ?`)
    .bind(ownerId, parentId)
    .first<{ next: number }>();
  return row?.next ?? 0;
}

/** Una carpeta del Dueño, o null si no existe o es de otro. */
export async function ownFolder(db: D1Database, ownerId: string, id: unknown): Promise<Folder | null> {
  if (typeof id !== "string" || !isFolderId(id)) return null;
  return db
    .prepare("SELECT id, name, parent_id AS parentId, position FROM folders WHERE id = ? AND owner_id = ?")
    .bind(id, ownerId)
    .first<Folder>();
}

/** Una carpeta cualquiera con su Dueño, para el Enlace de la carpeta. */
export async function findFolder(db: D1Database, id: string): Promise<(Folder & { ownerId: string }) | null> {
  if (!isFolderId(id)) return null;
  return db
    .prepare("SELECT id, name, parent_id AS parentId, position, owner_id AS ownerId FROM folders WHERE id = ?")
    .bind(id)
    .first<Folder & { ownerId: string }>();
}

/** Las carpetas de dentro, cada una con cuántas presentaciones y carpetas tiene. */
export function childrenOf(folders: Folder[], parentId: string | null, counts: Map<string, number>) {
  return folders
    .filter((f) => f.parentId === parentId)
    .map((f) => ({ ...f, decks: counts.get(f.id) ?? 0, folders: folders.filter((x) => x.parentId === f.id).length }));
}

export async function createFolder(
  db: D1Database,
  ownerId: string,
  rawName: unknown,
  parentId: string | null,
): Promise<{ ok: true; id: string } | { ok: false; error: FolderError }> {
  const name = cleanName(rawName);
  if (!name) return { ok: false, error: "nombre" };
  if (parentId && !(await ownFolder(db, ownerId, parentId))) return { ok: false, error: "no-existe" };
  const id = newDeckId();
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO folders (id, owner_id, parent_id, name, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, ownerId, parentId, name, await nextPosition(db, "folders", ownerId, parentId), now, now)
    .run();
  return { ok: true, id };
}

export async function renameFolder(db: D1Database, ownerId: string, id: string, rawName: unknown): Promise<FolderError | null> {
  const name = cleanName(rawName);
  if (!name) return "nombre";
  const { meta } = await db
    .prepare("UPDATE folders SET name = ?, updated_at = ? WHERE id = ? AND owner_id = ?")
    .bind(name, Date.now(), id, ownerId)
    .run();
  return meta.changes ? null : "no-existe";
}

/** Mueve una carpeta dentro de otra (o a la raíz). Nunca dentro de sí misma ni de una de sus hijas. */
export async function moveFolder(db: D1Database, ownerId: string, id: string, parentId: string | null): Promise<FolderError | null> {
  const folders = await listFolders(db, ownerId);
  if (!folders.some((f) => f.id === id)) return "no-existe";
  if (parentId && !folders.some((f) => f.id === parentId)) return "no-existe";
  if (parentId && descendantsOf(folders, id).has(parentId)) return "ciclo";
  await db
    .prepare("UPDATE folders SET parent_id = ?, position = ?, updated_at = ? WHERE id = ? AND owner_id = ?")
    .bind(parentId, await nextPosition(db, "folders", ownerId, parentId), Date.now(), id, ownerId)
    .run();
  return null;
}

/** Borra una carpeta. Lo que tenía dentro (carpetas y presentaciones) sube a la carpeta de arriba. */
export async function deleteFolder(db: D1Database, ownerId: string, id: string): Promise<Folder | null> {
  const folder = await ownFolder(db, ownerId, id);
  if (!folder) return null;
  const parent = folder.parentId;
  const folderBase = await nextPosition(db, "folders", ownerId, parent);
  const deckBase = await nextPosition(db, "decks", ownerId, parent);
  await db.batch([
    db
      .prepare("UPDATE folders SET parent_id = ?, position = ? + position WHERE parent_id = ? AND owner_id = ?")
      .bind(parent, folderBase, id, ownerId),
    db
      .prepare("UPDATE decks SET folder_id = ?, position = ? + COALESCE(position, 0) WHERE folder_id = ? AND owner_id = ?")
      .bind(parent, deckBase, id, ownerId),
    db.prepare("DELETE FROM folders WHERE id = ? AND owner_id = ?").bind(id, ownerId),
  ]);
  return folder;
}

/** Mueve una presentación a una carpeta (o a la raíz), al final. */
export async function moveDeck(db: D1Database, ownerId: string, deckId: string, folderId: string | null): Promise<FolderError | null> {
  if (folderId && !(await ownFolder(db, ownerId, folderId))) return "no-existe";
  const { meta } = await db
    .prepare("UPDATE decks SET folder_id = ?, position = ? WHERE id = ? AND owner_id = ?")
    .bind(folderId, await nextPosition(db, "decks", ownerId, folderId), deckId, ownerId)
    .run();
  return meta.changes ? null : "no-existe";
}

/**
 * Guarda el orden que el Dueño les dio a las carpetas o a las presentaciones
 * de una carpeta. Vienen todas, y todas tienen que ser suyas y estar ahí.
 */
export async function reorder(
  db: D1Database,
  ownerId: string,
  parentId: string | null,
  kind: "folders" | "decks",
  ids: string[],
): Promise<boolean> {
  if (ids.length === 0 || ids.length > 500 || new Set(ids).size !== ids.length) return false;
  const column = kind === "folders" ? "parent_id" : "folder_id";
  const { results } = await db
    .prepare(`SELECT id FROM ${kind} WHERE owner_id = ? AND ${column} IS ?`)
    .bind(ownerId, parentId)
    .all<{ id: string }>();
  const siblings = new Set(results.map((r) => r.id));
  if (ids.length !== siblings.size || !ids.every((id) => siblings.has(id))) return false;
  await db.batch(ids.map((id, position) => db.prepare(`UPDATE ${kind} SET position = ? WHERE id = ? AND owner_id = ?`).bind(position, id, ownerId)));
  return true;
}

export { nextPosition };
