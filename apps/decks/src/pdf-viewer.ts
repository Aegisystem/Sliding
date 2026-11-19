import type { Texts } from "@sliding/core";
import pdfjsPackage from "pdfjs-dist/package.json";

/** Donde quedan los archivos de pdf.js que copia scripts/copy-pdfjs.mjs. */
export const PDFJS_PATH = `/pdfjs/${pdfjsPackage.version}/`;

export interface PdfDeck {
  id: string;
  title: string;
  size: number;
  updatedAt: number;
}

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * La dirección del PDF lleva la fecha de la última versión: al reemplazarlo
 * cambia, así que el navegador puede guardar cada versión sin volver a preguntar.
 */
export const pdfUrl = (deck: PdfDeck) => `/v/${deck.id}/pdf?v=${deck.updatedAt}`;

/**
 * La página que muestra una Presentación en PDF (ADR 0004). Todo el código es
 * nuestro y vive en archivos aparte, así que la política de contenido puede
 * prohibir cualquier script en línea. visor.js habla con la Pantalla igual
 * que el puente de las presentaciones HTML.
 */
export function viewerHtml(deck: PdfDeck, appOrigin: string, t: Texts): Response {
  const page = `<!doctype html>
<html lang="${t.lang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${escape(deck.title)}</title>
<link rel="stylesheet" href="/visor.css" />
<link rel="modulepreload" href="${PDFJS_PATH}pdf.min.mjs" />
<script type="module" src="/visor.js"></script>
</head>
<body data-pdf="${escape(pdfUrl(deck))}" data-size="${deck.size}" data-app="${escape(appOrigin)}" data-pdfjs="${PDFJS_PATH}"
  data-t-progress="${escape(t.viewer.progress)}" data-t-slide="${escape(t.viewer.slideOf)}" data-t-error="${escape(t.viewer.error)}">
<main class="stage" data-stage></main>
<p class="status" data-status>${escape(t.viewer.loading)}</p>
<p class="visually-hidden" data-live aria-live="polite"></p>
</body>
</html>`;
  return new Response(page, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": [
        "default-src 'none'",
        // pdf.js decodifica algunas imágenes con WebAssembly.
        "script-src 'self' 'wasm-unsafe-eval'",
        "worker-src 'self' blob:",
        "connect-src 'self'",
        "img-src 'self' blob: data:",
        "font-src 'self' blob: data:",
        "style-src 'self'",
        "base-uri 'none'",
        "form-action 'none'",
        // Solo la app puede embeberla (ADR 0001).
        `frame-ancestors ${appOrigin}`,
      ].join("; "),
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex",
      "referrer-policy": "no-referrer",
      "cache-control": "no-cache",
    },
  });
}

/** El PDF tal cual. Con la versión al día se guarda un año; sin ella, siempre se revisa. */
export async function pdfFile(deck: PdfDeck, env: Cloudflare.Env, version: string | null): Promise<Response | null> {
  const body = await env.DECKS.get(`deck:${deck.id}`, "arrayBuffer");
  if (!body) return null;
  return new Response(body, {
    headers: {
      "content-type": "application/pdf",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex",
      // Solo la página de la presentación lo pide: otros sitios no pueden incrustarlo.
      "cross-origin-resource-policy": "same-origin",
      "cache-control": version === String(deck.updatedAt) ? "public, max-age=31536000, immutable" : "no-cache",
    },
  });
}
