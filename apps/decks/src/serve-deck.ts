import { isDeckId } from "@sliding/core";

export async function serveDeck(id: string, env: Cloudflare.Env): Promise<Response> {
  if (!isDeckId(id)) return notFound();
  const html = await env.DECKS.get(`deck:${id}`, "stream");
  if (!html) return notFound();
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}

function notFound(): Response {
  return new Response("Deck no encontrado", { status: 404 });
}
