import { html } from "hono/html";

const head = (title: string) => html`<meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>${title}</title>`;

export const homePage = () => html`<!doctype html>
<html lang="es">
<head>
  ${head("Sliding")}
</head>
<body>
  <h1>Sliding</h1>
  <p>Sube tu deck HTML y preséntalo con el celular.</p>
</body>
</html>`;

/** Página del Enlace del deck: el deck ocupa toda la ventana, servido desde su propio origen. */
export const viewerPage = ({ title, src }: { title: string; src: string }) => html`<!doctype html>
<html lang="es">
<head>
  ${head(`${title} · Sliding`)}
  <style>
    html, body { margin: 0; height: 100%; background: #000; overflow: hidden; }
    iframe { display: block; width: 100%; height: 100%; border: 0; }
  </style>
</head>
<body>
  <iframe
    src="${src}"
    title="${title}"
    allow="fullscreen"
    sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-downloads"
  ></iframe>
  <script>
    // El teclado mueve el deck solo si el iframe tiene el foco.
    const frame = document.querySelector("iframe");
    frame.addEventListener("load", () => frame.focus());
  </script>
</body>
</html>`;

export const notFoundPage = () => html`<!doctype html>
<html lang="es">
<head>
  ${head("Deck no encontrado · Sliding")}
</head>
<body>
  <h1>Deck no encontrado</h1>
  <p>Revisa el enlace. Si el deck existía, puede que su Dueño lo haya borrado.</p>
</body>
</html>`;
