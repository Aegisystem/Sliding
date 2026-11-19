import { isDeckId } from "@sliding/core";
import { type Context, Hono } from "hono";
import { createMiddleware } from "hono/factory";
import {
  childrenOf,
  createFolder,
  deleteFolder,
  isFolderId,
  listFolders,
  moveDeck,
  moveFolder,
  ownFolder,
  pathTo,
  renameFolder,
  reorder,
} from "../folders/store";
import { notFoundPage, panelPage } from "../pages";
import type { AppEnv } from "../types";
import type { Limits } from "./limits";
import { parseNotes } from "./notes";
import { deckCounts, deleteDeck, listDecks, saveNotes, storeDeck, usage } from "./store";

// El panel es solo del Dueño con sesión.
const requireUser = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.var.user) return c.redirect("/", 302);
  return next();
});

/** La vista del panel: la raíz o una carpeta, con un aviso opcional. */
const panelUrl = (folderId: string | null, query = "") =>
  `${folderId ? `/panel/f/${folderId}` : "/panel"}${query ? `?${query}` : ""}`;

/** La carpeta a la que vuelve un formulario, si es del Dueño; si no, la raíz. */
async function backTo(c: Context<AppEnv>, raw: unknown): Promise<string | null> {
  return (await ownFolder(c.env.DB, c.var.user!.id, raw))?.id ?? null;
}

/**
 * Al mover, el formulario de «Mover a» espera que lo devuelvan al panel; el
 * arrastre del panel pide JSON y se queda en la página (#20).
 */
function moveAnswer(c: Context<AppEnv>, back: string | null, error: string | null, ok: string) {
  if (c.req.header("accept")?.includes("application/json")) {
    return error ? c.json({ error }, error === "no-existe" ? 404 : 400) : c.body(null, 204);
  }
  return c.redirect(panelUrl(back, error ? `error=${error}` : `ok=${ok}`), 303);
}

/** «Mover a»: "raiz" es la raíz; cualquier otro valor tiene que ser una carpeta del Dueño. */
async function destination(c: Context<AppEnv>, raw: unknown): Promise<{ ok: true; id: string | null } | { ok: false }> {
  if (raw === "raiz") return { ok: true, id: null };
  const folder = await ownFolder(c.env.DB, c.var.user!.id, raw);
  return folder ? { ok: true, id: folder.id } : { ok: false };
}

export function panelRoutes(limits: Limits) {
  const panel = new Hono<AppEnv>();
  panel.use(requireUser);

  const view = async (c: Context<AppEnv>, folderId: string | null) => {
    const user = c.var.user!;
    const db = c.env.DB;
    const [folders, decks, used, counts] = await Promise.all([
      listFolders(db, user.id),
      listDecks(db, user.id, folderId),
      usage(db, user.id),
      deckCounts(db, user.id),
    ]);
    const folder = folderId ? (folders.find((f) => f.id === folderId) ?? null) : null;
    if (folderId && !folder) return c.html(notFoundPage(user, "carpeta"), 404);
    return c.html(
      panelPage({
        user,
        decks,
        usage: used,
        limits,
        origin: new URL(c.req.url).origin,
        ok: c.req.query("ok"),
        error: c.req.query("error"),
        folder,
        path: pathTo(folders, folderId),
        children: childrenOf(folders, folderId, counts),
        folders,
      }),
    );
  };

  panel.get("/", (c) => view(c, null));
  panel.get("/f/:id", (c) => {
    const id = c.req.param("id");
    return isFolderId(id) ? view(c, id) : c.html(notFoundPage(c.var.user, "carpeta"), 404);
  });

  // ── Carpetas ────────────────────────────────────────────────────────────

  panel.post("/carpetas", async (c) => {
    const body = await c.req.parseBody();
    const parent = await backTo(c, body["carpeta"]);
    const result = await createFolder(c.env.DB, c.var.user!.id, body["nombre"], parent);
    return c.redirect(panelUrl(parent, result.ok ? "ok=carpeta-creada" : `error=${result.error}`), 303);
  });

  panel.post("/carpetas/:id/nombre", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.parseBody();
    const error = isFolderId(id) ? await renameFolder(c.env.DB, c.var.user!.id, id, body["nombre"]) : "no-existe";
    if (error === "no-existe") return c.redirect(panelUrl(null, "error=no-existe"), 303);
    return c.redirect(panelUrl(id, error ? `error=${error}` : "ok=carpeta-renombrada"), 303);
  });

  panel.post("/carpetas/:id/mover", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.parseBody();
    const back = await backTo(c, body["volver"]);
    const target = await destination(c, body["destino"]);
    const error = !isFolderId(id) || !target.ok ? "no-existe" : await moveFolder(c.env.DB, c.var.user!.id, id, target.id);
    return moveAnswer(c, back, error, "carpeta-movida");
  });

  panel.post("/carpetas/:id/borrar", async (c) => {
    const id = c.req.param("id");
    const deleted = isFolderId(id) ? await deleteFolder(c.env.DB, c.var.user!.id, id) : null;
    if (!deleted) return c.redirect(panelUrl(null, "error=no-existe"), 303);
    return c.redirect(panelUrl(deleted.parentId, "ok=carpeta-borrada"), 303);
  });

  // ── Presentaciones ──────────────────────────────────────────────────────

  // `notas` llega solo con un PDF: las notas que el navegador leyó del .pptx (ADR 0004).
  panel.post("/decks", async (c) => {
    const body = await c.req.parseBody();
    const folderId = await backTo(c, body["carpeta"]);
    const file = body["file"];
    if (!(file instanceof File)) return c.redirect(panelUrl(folderId, "error=vacio"), 303);
    const notes = parseNotes(body["notas"]);
    if (notes === "invalidas") return c.redirect(panelUrl(folderId, "error=notas"), 303);
    const result = await storeDeck(c.env, limits, { ownerId: c.var.user!.id, file, folderId, notes });
    return c.redirect(panelUrl(folderId, result.ok ? "ok=subido" : `error=${result.error}`), 303);
  });

  panel.post("/decks/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.parseBody();
    const back = await backTo(c, body["volver"]);
    const file = body["file"];
    if (!isDeckId(id)) return c.redirect(panelUrl(back, "error=no-existe"), 303);
    if (!(file instanceof File)) return c.redirect(panelUrl(back, "error=vacio"), 303);
    const notes = parseNotes(body["notas"]);
    if (notes === "invalidas") return c.redirect(panelUrl(back, "error=notas"), 303);
    const result = await storeDeck(c.env, limits, { ownerId: c.var.user!.id, file, deckId: id, notes });
    return c.redirect(panelUrl(back, result.ok ? "ok=reemplazado" : `error=${result.error}`), 303);
  });

  // «Agregar notas» de una Presentación en PDF: el .pptx no viene, solo su texto.
  panel.post("/decks/:id/notas", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.parseBody();
    const back = await backTo(c, body["volver"]);
    if (!isDeckId(id)) return c.redirect(panelUrl(back, "error=no-existe"), 303);
    const notes = parseNotes(body["notas"]);
    if (!notes || notes === "invalidas") return c.redirect(panelUrl(back, "error=notas"), 303);
    const saved = await saveNotes(c.env, c.var.user!.id, id, notes);
    return c.redirect(panelUrl(back, saved ? "ok=notas" : "error=no-existe"), 303);
  });

  panel.post("/decks/:id/delete", async (c) => {
    const id = c.req.param("id");
    const back = await backTo(c, (await c.req.parseBody())["volver"]);
    const deleted = isDeckId(id) && (await deleteDeck(c.env, c.var.user!.id, id));
    return c.redirect(panelUrl(back, deleted ? "ok=borrado" : "error=no-existe"), 303);
  });

  panel.post("/decks/:id/mover", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.parseBody();
    const back = await backTo(c, body["volver"]);
    const target = await destination(c, body["destino"]);
    const error = !isDeckId(id) || !target.ok ? "no-existe" : await moveDeck(c.env.DB, c.var.user!.id, id, target.id);
    return moveAnswer(c, back, error, "movido");
  });

  // ── Orden: lo guarda el panel al arrastrar o al usar Subir y Bajar ──────

  panel.post("/orden", async (c) => {
    const body = await c.req.json<{ parent?: unknown; kind?: unknown; ids?: unknown }>().catch(() => null);
    const kind = body?.kind;
    const ids = body?.ids;
    if ((kind !== "folders" && kind !== "decks") || !Array.isArray(ids) || !ids.every((id) => typeof id === "string")) {
      return c.json({ error: "pedido-invalido" }, 400);
    }
    const parent = body?.parent ? await ownFolder(c.env.DB, c.var.user!.id, body.parent) : null;
    if (body?.parent && !parent) return c.json({ error: "no-existe" }, 404);
    const saved = await reorder(c.env.DB, c.var.user!.id, parent?.id ?? null, kind, ids as string[]);
    return saved ? c.body(null, 204) : c.json({ error: "orden-invalido" }, 400);
  });

  return panel;
}
