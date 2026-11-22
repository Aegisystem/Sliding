import { TEXTS, isDeckId } from "@sliding/core";
import { type Context, Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { formatBytes } from "../pages";
import type { Limits } from "../decks/limits";
import { type StoreError, storeDeck } from "../decks/store";
import type { AppEnv } from "../types";
import { ownerOfKey } from "./keys";

// La API para Agentes (#8): subir y reemplazar presentaciones con una Clave
// para Agentes. La lee un Agente, así que habla en inglés, y /llms.txt la
// explica. Nunca usa la sesión: solo la clave del encabezado Authorization,
// que un sitio ajeno no puede mandar. Por eso no pide el mismo origen.

type ApiEnv = { Bindings: AppEnv["Bindings"]; Variables: AppEnv["Variables"] & { ownerId: string } };

/** Un error que un Agente puede entender y resolver: un código fijo y qué hacer. */
function problem(c: Context<ApiEnv>, status: ContentfulStatusCode, error: string, message: string) {
  return c.json({ error, message }, status);
}

/** Cada error de storeDeck, con su estado HTTP, su código para el Agente y qué hacer. */
function storeProblem(c: Context<ApiEnv>, error: StoreError, limits: Limits) {
  const origin = new URL(c.req.url).origin;
  const en = TEXTS.en;
  switch (error) {
    case "vacio":
      return problem(c, 400, "empty", 'Send the presentation as a multipart form field named "file", for example: -F "file=@index.html".');
    case "formato":
      return problem(c, 415, "format", "Sliding accepts .html and .pdf files. Export other formats (PowerPoint, Keynote, Google Slides) as PDF.");
    case "no-pdf":
      return problem(c, 400, "not-pdf", "That file isn't a valid PDF. Export it again from the presentation app.");
    case "muy-grande":
      return problem(c, 413, "too-large", `The file is over ${formatBytes(limits.deckBytes, en)}. Shrink its images and try again.`);
    case "cupo-espacio":
      return problem(
        c,
        413,
        "no-space",
        `The owner's presentations already use their ${formatBytes(limits.bytesPerOwner, en)}. Ask the owner to delete one at ${origin}/panel.`,
      );
    case "no-existe":
      return notFound(c);
  }
}

const notFound = (c: Context<ApiEnv>) =>
  problem(
    c,
    404,
    "not-found",
    "There's no presentation with that id for this key's owner. Upload it as a new presentation (POST /api/v1/presentations) and save the new id.",
  );

/** Lo que el Agente recibe de una presentación: su id y sus dos enlaces. */
async function answer(c: Context<ApiEnv>, id: string, status: 200 | 201) {
  const origin = new URL(c.req.url).origin;
  const deck = await c.env.DB.prepare("SELECT title, kind, slide_count AS slides, present_secret AS secret FROM decks WHERE id = ?")
    .bind(id)
    .first<{ title: string; kind: string; slides: number | null; secret: string }>();
  if (!deck) return notFound(c);
  return c.json(
    {
      id,
      title: deck.title,
      kind: deck.kind,
      slides: deck.slides,
      link: `${origin}/d/${id}`,
      presentingLink: `${origin}/p/${deck.secret}`,
    },
    status,
  );
}

export function apiRoutes(limits: Limits) {
  const api = new Hono<ApiEnv>();

  api.use(async (c, next) => {
    const key = /^Bearer\s+(\S+)$/i.exec(c.req.header("authorization") ?? "")?.[1];
    const ownerId = await ownerOfKey(c.env.DB, key);
    if (!ownerId) {
      c.header("www-authenticate", "Bearer");
      const origin = new URL(c.req.url).origin;
      return problem(
        c,
        401,
        "unauthorized",
        `Missing, wrong or revoked agent key. Ask the owner to create one at ${origin}/panel/agentes and send it as "Authorization: Bearer <key>".`,
      );
    }
    c.set("ownerId", ownerId);
    return next();
  });

  const fileOf = async (c: Context<ApiEnv>) => {
    const body = await c.req.parseBody().catch(() => ({}) as Record<string, unknown>);
    return body["file"] instanceof File ? body["file"] : null;
  };

  // Subir una presentación nueva. Queda en la raíz del panel de su Dueño.
  api.post("/presentations", async (c) => {
    const file = await fileOf(c);
    if (!file) return storeProblem(c, "vacio", limits);
    const result = await storeDeck(c.env, limits, { ownerId: c.var.ownerId, file });
    return result.ok ? answer(c, result.id, 201) : storeProblem(c, result.error, limits);
  });

  // Reemplazar una presentación del Dueño: su id y sus enlaces no cambian.
  // Lo que desactivó el Administrador no se toca (#11).
  api.put("/presentations/:id", async (c) => {
    const id = c.req.param("id");
    const mine =
      isDeckId(id) &&
      (await c.env.DB.prepare("SELECT 1 FROM decks WHERE id = ? AND owner_id = ? AND disabled = 0").bind(id, c.var.ownerId).first());
    if (!mine) return notFound(c);
    const file = await fileOf(c);
    if (!file) return storeProblem(c, "vacio", limits);
    const result = await storeDeck(c.env, limits, { ownerId: c.var.ownerId, file, deckId: id });
    return result.ok ? answer(c, id, 200) : storeProblem(c, result.error, limits);
  });

  api.all("*", (c) => notFound(c));

  return api;
}
