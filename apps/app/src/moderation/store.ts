import { type DeckKind, isDeckId } from "@sliding/core";
import { isPresentSecret } from "../decks/store";

/**
 * Los administradores: ids de cuenta de Sliding en `ADMIN_USER_IDS`, separados
 * por comas (#11). Solo ellos moderan.
 */
export const adminIds = (env: Cloudflare.Env): string[] =>
  (env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

/** Una presentación como la ve el administrador: con su Dueño. */
export interface ModDeck {
  id: string;
  title: string;
  kind: DeckKind;
  slideCount: number | null;
  size: number;
  disabled: number;
  createdAt: number;
  ownerId: string | null;
  ownerName: string | null;
  ownerDisabled: number;
}

/** Un Dueño como lo ve el administrador. */
export interface ModOwner {
  id: string;
  name: string;
  provider: string;
  email: string | null;
  disabled: number;
  createdAt: number;
  lastLoginAt: number;
  decks: number;
  bytes: number;
}

const DECK_COLUMNS = `decks.id, decks.title, decks.kind, decks.slide_count AS slideCount, decks.size, decks.disabled,
  decks.created_at AS createdAt, decks.owner_id AS ownerId, users.name AS ownerName, COALESCE(users.disabled, 0) AS ownerDisabled
  FROM decks LEFT JOIN users ON users.id = decks.owner_id`;

const OWNER_COLUMNS = `users.id, users.name, users.provider, users.email, users.disabled,
  users.created_at AS createdAt, users.last_login_at AS lastLoginAt,
  (SELECT COUNT(*) FROM decks WHERE decks.owner_id = users.id) AS decks,
  (SELECT COALESCE(SUM(size), 0) FROM decks WHERE decks.owner_id = users.id) AS bytes
  FROM users`;

export async function recentDecks(db: D1Database, limit = 30): Promise<ModDeck[]> {
  const { results } = await db.prepare(`SELECT ${DECK_COLUMNS} ORDER BY decks.created_at DESC LIMIT ?`).bind(limit).all<ModDeck>();
  return results;
}

export async function recentOwners(db: D1Database, limit = 50): Promise<ModOwner[]> {
  const { results } = await db.prepare(`SELECT ${OWNER_COLUMNS} ORDER BY users.created_at DESC LIMIT ?`).bind(limit).all<ModOwner>();
  return results;
}

const deckBy = (db: D1Database, column: "id" | "present_secret", value: string) =>
  db.prepare(`SELECT ${DECK_COLUMNS} WHERE decks.${column} = ?`).bind(value).first<ModDeck>();

const ownerById = (db: D1Database, id: string | null) =>
  id ? db.prepare(`SELECT ${OWNER_COLUMNS} WHERE users.id = ?`).bind(id).first<ModOwner>() : Promise.resolve(null);

/** Lo que encontró «Pegar un enlace». */
export type Found =
  | { type: "deck"; deck: ModDeck; owner: ModOwner | null }
  | { type: "folder"; folder: { id: string; name: string }; owner: ModOwner | null }
  | { type: "control" }
  | { type: "none" };

const PATHS: [RegExp, "deck" | "secret" | "folder" | "control"][] = [
  [/^\/d\/([^/]+)\/?$/, "deck"],
  [/^\/v\/([^/]+)(?:\/pdf)?\/?$/, "deck"],
  [/^\/p\/([^/]+)\/?$/, "secret"],
  [/^\/(?:panel\/)?f\/([^/]+)\/?$/, "folder"],
  [/^\/c\/[^/]+\/?$/, "control"],
];

/**
 * Busca la presentación o la carpeta de cualquier enlace de Sliding: el de la
 * presentación (en la app o en el origen de las presentaciones), el Enlace para
 * presentar o el de una carpeta. También acepta el id solo.
 */
export async function resolveLink(db: D1Database, raw: string): Promise<Found> {
  const text = raw.trim();
  let path = text;
  try {
    path = new URL(text).pathname;
  } catch {
    // No es una dirección completa: puede ser una ruta o un id.
  }
  path = path.replace(/[?#].*$/, "");
  try {
    path = decodeURIComponent(path);
  } catch {
    // Un % suelto: se busca tal cual.
  }

  let kind: "deck" | "secret" | "folder" | "control" | "id" | null = null;
  let value = "";
  for (const [pattern, type] of PATHS) {
    const match = pattern.exec(path);
    if (match) {
      kind = type;
      value = match[1] ?? "";
      break;
    }
  }
  if (!kind && isDeckId(text)) [kind, value] = ["id", text];

  if (kind === "control") return { type: "control" };
  if (kind === "secret" && isPresentSecret(value)) {
    const deck = await deckBy(db, "present_secret", value);
    if (deck) return { type: "deck", deck, owner: await ownerById(db, deck.ownerId) };
  }
  if ((kind === "deck" || kind === "id") && isDeckId(value)) {
    const deck = await deckBy(db, "id", value);
    if (deck) return { type: "deck", deck, owner: await ownerById(db, deck.ownerId) };
  }
  if ((kind === "folder" || kind === "id") && isDeckId(value)) {
    const folder = await db
      .prepare("SELECT id, name, owner_id AS ownerId FROM folders WHERE id = ?")
      .bind(value)
      .first<{ id: string; name: string; ownerId: string }>();
    if (folder) return { type: "folder", folder: { id: folder.id, name: folder.name }, owner: await ownerById(db, folder.ownerId) };
  }
  return { type: "none" };
}

export async function setDeckDisabled(db: D1Database, id: string, disabled: boolean): Promise<boolean> {
  if (!isDeckId(id)) return false;
  const row = await db.prepare("UPDATE decks SET disabled = ? WHERE id = ? RETURNING id").bind(disabled ? 1 : 0, id).first();
  return Boolean(row);
}

export async function setOwnerDisabled(db: D1Database, id: string, disabled: boolean): Promise<boolean> {
  const row = await db.prepare("UPDATE users SET disabled = ? WHERE id = ? RETURNING id").bind(disabled ? 1 : 0, id).first();
  return Boolean(row);
}
