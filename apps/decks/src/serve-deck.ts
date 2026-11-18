import { type DeckKind, isDeckId, stripNotes } from "@sliding/core";

export async function serveDeck(id: string, env: Cloudflare.Env): Promise<Response> {
  if (!isDeckId(id)) return notFound();
  const deck = await env.DB.prepare("SELECT kind FROM decks WHERE id = ? AND disabled = 0")
    .bind(id)
    .first<{ kind: DeckKind }>();
  if (!deck) return notFound();
  const html = await env.DECKS.get(`deck:${id}`, "stream");
  if (!html) return notFound();

  const response = new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Solo la app puede embeber el deck (ADR 0001).
      "content-security-policy": `frame-ancestors ${env.APP_ORIGIN}`,
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex",
      "referrer-policy": "no-referrer",
      // Subir otra versión reemplaza el deck: siempre se revisa con el servidor.
      "cache-control": "no-cache",
    },
  });
  return deck.kind === "html-slides" ? stripNotes(response) : response;
}

function notFound(): Response {
  return new Response("Presentación no encontrada", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8", "x-robots-tag": "noindex" },
  });
}
