import { isDeckId } from "@sliding/core";
import { type Context, Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { type Providers, realProviders } from "./auth/providers";
import { authRoutes } from "./auth/routes";
import { readSession } from "./auth/session";
import { findUser } from "./auth/users";
import { homePage, notFoundPage, privacyPage, viewerPage } from "./pages";
import { sameOrigin } from "./same-origin";
import type { AppEnv } from "./types";

interface Deps {
  /** Los proveedores de OAuth. Los tests pasan unos falsos para no salir a internet. */
  providers: (c: Context<AppEnv>) => Providers;
}

const defaultDeps: Deps = {
  providers: (c) => realProviders(c.env, new URL(c.req.url).origin),
};

// Deja en c.var.user al Dueño con sesión, o null.
const loadUser = createMiddleware<AppEnv>(async (c, next) => {
  const userId = await readSession(c);
  const user = userId ? await findUser(c.env.DB, userId) : null;
  c.set("user", user && !user.disabled ? user : null);
  return next();
});

export function createApp(deps: Deps = defaultDeps) {
  const app = new Hono<AppEnv>();
  app.use(sameOrigin);
  app.use(loadUser);

  app.route("/auth", authRoutes(deps.providers));

  app.get("/", (c) => c.html(homePage({ user: c.var.user, error: c.req.query("error") })));

  // Google la pide para publicar el inicio de sesión (#12).
  app.get("/privacidad", (c) => c.html(privacyPage()));

  // Enlace del deck: cualquiera con el enlace lo ve, sin notas ni opción de presentar.
  app.get("/d/:id", async (c) => {
    const id = c.req.param("id");
    const deck = isDeckId(id)
      ? await c.env.DB.prepare("SELECT title FROM decks WHERE id = ? AND disabled = 0")
          .bind(id)
          .first<{ title: string }>()
      : null;
    if (!deck) return c.html(notFoundPage(), 404);
    return c.html(viewerPage({ title: deck.title, src: `${c.env.DECKS_ORIGIN}/v/${id}` }));
  });

  app.notFound((c) => c.html(notFoundPage(), 404));
  return app;
}

export default createApp();
