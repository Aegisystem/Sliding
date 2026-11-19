import { serveDeck, servePdf } from "./serve-deck";

// Los decks no se indexan: el Enlace del deck no está listado.
const ROBOTS = "User-agent: *\nDisallow: /\n";
const DECK_PATH = /^\/v\/([^/]+)$/;
const PDF_PATH = /^\/v\/([^/]+)\/pdf$/;

// pdf.js, visor.js y visor.css son archivos estáticos (public/): se sirven antes que este Worker.
export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Método no permitido", { status: 405, headers: { allow: "GET, HEAD" } });
    }
    if (pathname === "/robots.txt") {
      return new Response(ROBOTS, { headers: { "content-type": "text/plain; charset=utf-8" } });
    }
    const deck = DECK_PATH.exec(pathname);
    if (deck) return serveDeck(deck[1]!, env);
    const pdf = PDF_PATH.exec(pathname);
    if (pdf) return servePdf(pdf[1]!, env, url.searchParams.get("v"));
    return new Response("No encontrado", { status: 404, headers: { "x-robots-tag": "noindex" } });
  },
} satisfies ExportedHandler<Cloudflare.Env>;
