import { isDeckId } from "@sliding/core";
import { Hono } from "hono";
import { homePage, notFoundPage, privacyPage, viewerPage } from "./pages";

const app = new Hono<{ Bindings: Cloudflare.Env }>();

app.get("/", (c) => c.html(homePage()));

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

export default app;
