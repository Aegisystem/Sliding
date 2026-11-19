import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { moderationPage, moderationSetupPage, notFoundPage } from "../pages";
import type { AppEnv } from "../types";
import { adminIds, recentDecks, recentOwners, resolveLink, setDeckDisabled, setOwnerDisabled } from "./store";

/**
 * Moderación (#11): solo el administrador. Para cualquier otra persona la
 * página no existe. Mientras no haya administrador, a quien entra con su
 * cuenta se le muestra su id, para copiarlo en `ADMIN_USER_IDS`.
 */
const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.var.user;
  const admins = adminIds(c.env);
  if (user && admins.includes(user.id)) return next();
  if (user && admins.length === 0 && c.req.method === "GET") return c.html(moderationSetupPage(user));
  return c.html(notFoundPage(user), 404);
});

/** Vuelve a la página con lo que se había buscado y un aviso. */
function back(search: unknown, notice: string): string {
  const query = new URLSearchParams();
  if (typeof search === "string" && search.trim()) query.set("enlace", search.trim().slice(0, 500));
  query.set(notice.startsWith("error=") ? "error" : "ok", notice.replace(/^(error|ok)=/, ""));
  return `/moderacion?${query}`;
}

export function moderationRoutes() {
  const mod = new Hono<AppEnv>();
  mod.use(requireAdmin);

  mod.get("/", async (c) => {
    const db = c.env.DB;
    const search = (c.req.query("enlace") ?? "").trim().slice(0, 500);
    const [found, decks, owners] = await Promise.all([
      search ? resolveLink(db, search) : Promise.resolve(null),
      recentDecks(db),
      recentOwners(db),
    ]);
    return c.html(
      moderationPage({
        user: c.var.user!,
        search,
        found,
        decks,
        owners,
        ok: c.req.query("ok"),
        error: c.req.query("error"),
      }),
    );
  });

  for (const [action, disabled] of [["desactivar", true], ["reactivar", false]] as const) {
    mod.post(`/presentaciones/:id/${action}`, async (c) => {
      const search = (await c.req.parseBody())["enlace"];
      const done = await setDeckDisabled(c.env.DB, c.req.param("id"), disabled);
      return c.redirect(back(search, done ? `ok=presentacion-${action}` : "error=no-existe"), 303);
    });

    mod.post(`/duenos/:id/${action}`, async (c) => {
      const search = (await c.req.parseBody())["enlace"];
      const id = c.req.param("id");
      // Desactivarse a uno mismo dejaría el sitio sin quien lo modere.
      if (id === c.var.user!.id) return c.redirect(back(search, "error=propia"), 303);
      const done = await setOwnerDisabled(c.env.DB, id, disabled);
      return c.redirect(back(search, done ? `ok=dueno-${action}` : "error=no-existe"), 303);
    });
  }

  return mod;
}
