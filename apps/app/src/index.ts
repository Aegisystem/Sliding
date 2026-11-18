import { isDeckId } from "@sliding/core";
import { type Context, Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { type Providers, realProviders } from "./auth/providers";
import { authRoutes } from "./auth/routes";
import { readSession } from "./auth/session";
import { findUser } from "./auth/users";
import { LIMITS, type Limits } from "./decks/limits";
import { panelRoutes } from "./decks/routes";
import { deckCounts, listPublicDecks } from "./decks/store";
import { childrenOf, findFolder, listFolders, pathTo } from "./folders/store";
import { liveRoutes } from "./live/routes";
import { folderPage, homePage, notFoundPage, privacyPage, skillPage, viewerPage } from "./pages";
import { sameOrigin } from "./same-origin";
import type { AppEnv } from "./types";

interface Deps {
  /** Los proveedores de OAuth. Los tests pasan unos falsos para no salir a internet. */
  providers: (c: Context<AppEnv>) => Providers;
  /** Límites de tamaño y cupo. Los tests usan unos chicos. */
  limits: Limits;
}

const defaultDeps: Deps = {
  providers: (c) => realProviders(c.env, new URL(c.req.url).origin),
  limits: LIMITS,
};

// Deja en c.var.user al Dueño con sesión, o null.
const loadUser = createMiddleware<AppEnv>(async (c, next) => {
  const userId = await readSession(c);
  const user = userId ? await findUser(c.env.DB, userId) : null;
  c.set("user", user && !user.disabled ? user : null);
  return next();
});

export function createApp(overrides: Partial<Deps> = {}) {
  const deps: Deps = { ...defaultDeps, ...overrides };
  const app = new Hono<AppEnv>();
  app.use(sameOrigin);
  app.use(loadUser);

  app.route("/auth", authRoutes(deps.providers));
  app.route("/panel", panelRoutes(deps.limits));
  app.route("/", liveRoutes());

  app.get("/", (c) => c.html(homePage({ user: c.var.user, error: c.req.query("error"), limits: deps.limits })));

  // Google la pide para publicar el inicio de sesión (#12).
  app.get("/privacidad", (c) => c.html(privacyPage({ user: c.var.user })));

  // La skill html-slides para pasársela a tu IA (#17). El texto es un archivo estático.
  app.get("/skill", (c) => c.html(skillPage({ user: c.var.user })));

  // Enlace de la presentación: cualquiera con el enlace la ve, sin notas ni opción de presentar.
  app.get("/d/:id", async (c) => {
    const id = c.req.param("id");
    const deck = isDeckId(id)
      ? await c.env.DB.prepare("SELECT title FROM decks WHERE id = ? AND disabled = 0")
          .bind(id)
          .first<{ title: string }>()
      : null;
    if (!deck) return c.html(notFoundPage(c.var.user), 404);
    return c.html(viewerPage({ title: deck.title, src: `${c.env.DECKS_ORIGIN}/v/${id}` }));
  });

  // Enlace de la carpeta: sus carpetas y presentaciones, en el orden del Dueño y sin notas.
  // `?desde=` es la carpeta por la que se entró: la ruta de arriba muestra solo desde ahí,
  // así quien recibió el enlace de una unidad no ve el curso que la contiene.
  app.get("/f/:id", async (c) => {
    const db = c.env.DB;
    const folder = await findFolder(db, c.req.param("id"));
    if (!folder) return c.html(notFoundPage(c.var.user, "carpeta"), 404);
    const [folders, decks, counts] = await Promise.all([
      listFolders(db, folder.ownerId),
      listPublicDecks(db, folder.ownerId, folder.id),
      deckCounts(db, folder.ownerId, { visibleOnly: true }),
    ]);
    const full = pathTo(folders, folder.id);
    const start = full.findIndex((f) => f.id === c.req.query("desde"));
    const path = start >= 0 ? full.slice(start) : full.slice(-1);
    return c.html(
      folderPage({
        user: c.var.user,
        folder,
        path,
        root: path[0]!.id,
        children: childrenOf(folders, folder.id, counts),
        decks,
      }),
    );
  });

  app.notFound((c) => c.html(notFoundPage(c.var.user), 404));
  return app;
}

export default createApp();

export { LiveSession } from "./live/session";
