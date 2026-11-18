import type { DeckKind } from "@sliding/core";
import { Hono } from "hono";
import { isPresentSecret } from "../decks/store";
import { controlPage, notFoundPage, screenPage } from "../pages";
import type { AppEnv } from "../types";
import { isToken, randomToken } from "./session";

type DeckForSession = { id: string; title: string; kind: DeckKind; slide_count: number | null };

const findBySecret = (db: D1Database, secret: string) =>
  isPresentSecret(secret)
    ? db
        .prepare("SELECT id, title, kind, slide_count FROM decks WHERE present_secret = ? AND disabled = 0")
        .bind(secret)
        .first<DeckForSession>()
    : Promise.resolve(null);

export function liveRoutes() {
  const live = new Hono<AppEnv>();

  // Enlace para presentar: abre la Pantalla, que crea su Sesión en vivo y muestra el QR de control.
  live.get("/p/:secret", async (c) => {
    const secret = c.req.param("secret");
    const deck = await findBySecret(c.env.DB, secret);
    if (!deck) return c.html(notFoundPage(c.var.user), 404);
    return c.html(
      screenPage({
        title: deck.title,
        secret,
        deckSrc: `${c.env.DECKS_ORIGIN}/v/${deck.id}`,
        decksOrigin: c.env.DECKS_ORIGIN,
      }),
    );
  });

  live.post("/p/:secret/sesion", async (c) => {
    const deck = await findBySecret(c.env.DB, c.req.param("secret"));
    if (!deck) return c.json({ error: "no-existe" }, 404);
    const sessionId = randomToken();
    const stub = c.env.LIVE.get(c.env.LIVE.idFromName(sessionId));
    const { screenKey } = await stub.start({
      sessionId,
      deckId: deck.id,
      title: deck.title,
      kind: deck.kind,
      total: deck.slide_count,
      origin: new URL(c.req.url).origin,
    });
    return c.json({ sessionId, screenKey });
  });

  // Los WebSockets de la Pantalla y el Control. La llave viaja en la dirección; el origen tiene que ser la app.
  live.get("/live/:id/:role", async (c) => {
    const { id, role } = c.req.param();
    if (!isToken(id) || (role !== "screen" && role !== "control")) return c.text("No encontrado", 404);
    if (c.req.header("upgrade")?.toLowerCase() !== "websocket") return c.text("Se espera un WebSocket", 426);
    if (c.req.header("origin") !== new URL(c.req.url).origin) return c.text("Origen no permitido", 403);
    return c.env.LIVE.get(c.env.LIVE.idFromName(id)).fetch(c.req.raw);
  });

  // El Control: la dirección del QR de control.
  live.get("/c/:id", (c) => {
    const id = c.req.param("id");
    if (!isToken(id)) return c.html(notFoundPage(c.var.user), 404);
    return c.html(controlPage({ sessionId: id, decksOrigin: c.env.DECKS_ORIGIN }));
  });

  return live;
}
