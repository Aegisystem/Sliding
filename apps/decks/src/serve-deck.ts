import { type DeckKind, isDeckId, stripNotes } from "@sliding/core";
import { withBridge } from "./bridge";
import { pdfFile, viewerHtml } from "./pdf-viewer";

interface DeckFound {
  kind: DeckKind;
  title: string;
  size: number;
  updatedAt: number;
}

const findDeck = (id: string, env: Cloudflare.Env) =>
  isDeckId(id)
    ? env.DB.prepare("SELECT kind, title, size, updated_at AS updatedAt FROM decks WHERE id = ? AND disabled = 0")
        .bind(id)
        .first<DeckFound>()
    : Promise.resolve(null);

export async function serveDeck(id: string, env: Cloudflare.Env): Promise<Response> {
  const deck = await findDeck(id, env);
  if (!deck) return notFound();
  // Una Presentación en PDF se muestra con el visor de pdf.js (ADR 0004).
  if (deck.kind === "pdf") return viewerHtml({ id, ...deck }, env.APP_ORIGIN);

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
  const served = deck.kind === "html-slides" ? stripNotes(response) : response;
  return withBridge(served, env.APP_ORIGIN, deck.kind);
}

/** El archivo de una Presentación en PDF, para el visor. */
export async function servePdf(id: string, env: Cloudflare.Env, version: string | null): Promise<Response> {
  const deck = await findDeck(id, env);
  if (deck?.kind !== "pdf") return notFound();
  return (await pdfFile({ id, ...deck }, env, version)) ?? notFound();
}

function notFound(): Response {
  return new Response("Presentación no encontrada", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8", "x-robots-tag": "noindex" },
  });
}
