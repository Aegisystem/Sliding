import { isDeckId } from "@sliding/core";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { panelPage } from "../pages";
import type { AppEnv } from "../types";
import type { Limits } from "./limits";
import { deleteDeck, listDecks, storeDeck, usage } from "./store";

// El panel es solo del Dueño con sesión.
const requireUser = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.var.user) return c.redirect("/", 302);
  return next();
});

export function panelRoutes(limits: Limits) {
  const panel = new Hono<AppEnv>();
  panel.use(requireUser);

  panel.get("/", async (c) => {
    const user = c.var.user!;
    const [decks, used] = await Promise.all([listDecks(c.env.DB, user.id), usage(c.env.DB, user.id)]);
    return c.html(
      panelPage({
        user,
        decks,
        usage: used,
        limits,
        origin: new URL(c.req.url).origin,
        ok: c.req.query("ok"),
        error: c.req.query("error"),
      }),
    );
  });

  panel.post("/decks", async (c) => {
    const file = (await c.req.parseBody())["file"];
    if (!(file instanceof File)) return c.redirect("/panel?error=vacio", 303);
    const result = await storeDeck(c.env, limits, { ownerId: c.var.user!.id, file });
    return c.redirect(result.ok ? "/panel?ok=subido" : `/panel?error=${result.error}`, 303);
  });

  panel.post("/decks/:id", async (c) => {
    const id = c.req.param("id");
    const file = (await c.req.parseBody())["file"];
    if (!isDeckId(id)) return c.redirect("/panel?error=no-existe", 303);
    if (!(file instanceof File)) return c.redirect("/panel?error=vacio", 303);
    const result = await storeDeck(c.env, limits, { ownerId: c.var.user!.id, file, deckId: id });
    return c.redirect(result.ok ? "/panel?ok=reemplazado" : `/panel?error=${result.error}`, 303);
  });

  panel.post("/decks/:id/delete", async (c) => {
    const id = c.req.param("id");
    const deleted = isDeckId(id) && (await deleteDeck(c.env, c.var.user!.id, id));
    return c.redirect(deleted ? "/panel?ok=borrado" : "/panel?error=no-existe", 303);
  });

  return panel;
}
