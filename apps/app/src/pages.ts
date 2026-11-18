import { html } from "hono/html";

// Las páginas de decks no se indexan: el Enlace del deck no está listado.
const head = (title: string, { index = false } = {}) => html`<meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${index ? "" : html`<meta name="robots" content="noindex" />`}
  <title>${title}</title>`;

const textStyle = html`<style>
    body { max-width: 42rem; margin: 0 auto; padding: 2rem 1rem; font: 1.05rem/1.6 system-ui, sans-serif; color: #1d1d1f; }
    h1 { line-height: 1.2; }
    h2 { margin-top: 2rem; }
    footer { margin-top: 3rem; color: #6e6e73; font-size: .9rem; }
  </style>`;

export const homePage = () => html`<!doctype html>
<html lang="es">
<head>
  ${head("Sliding", { index: true })}
  ${textStyle}
</head>
<body>
  <h1>Sliding</h1>
  <p>Sube tu deck HTML y preséntalo con el celular.</p>
  <footer><a href="/privacidad">Privacidad</a></footer>
</body>
</html>`;

export const privacyPage = () => html`<!doctype html>
<html lang="es">
<head>
  ${head("Privacidad · Sliding", { index: true })}
  ${textStyle}
</head>
<body>
  <h1>Privacidad</h1>
  <p>Última actualización: 18 de noviembre de 2026.</p>
  <p>Sliding es un sitio para subir decks HTML y presentarlos con el celular. Esta página dice qué datos guarda, para qué y cómo borrarlos.</p>

  <h2>Qué guardamos</h2>
  <ul>
    <li><strong>Tu cuenta.</strong> Al entrar con GitHub o Google guardamos el identificador de tu cuenta en ese servicio, tu nombre y tu correo. Los usamos para mostrarte tus decks y para avisarte si hay un problema con ellos.</li>
    <li><strong>Tus decks.</strong> Guardamos los archivos HTML que subes y sus notas del orador. Cualquiera con el enlace de un deck puede verlo, pero sin las notas.</li>
    <li><strong>Tus tokens.</strong> Si creas tokens para que un agente suba decks por ti, guardamos solo una huella de cada token, su nombre y la última vez que se usó.</li>
    <li><strong>Las presentaciones en vivo.</strong> Mientras presentas guardamos en qué slide vas. Se borra cuando termina la sesión.</li>
  </ul>

  <h2>Cookies</h2>
  <p>Usamos una sola cookie, para que no tengas que iniciar sesión en cada visita. No usamos cookies de publicidad ni de analítica.</p>

  <h2>Con quién compartimos tus datos</h2>
  <p>Con nadie. Los datos viven en Cloudflare, que aloja el sitio. GitHub y Google solo intervienen cuando inicias sesión con ellos.</p>

  <h2>Cómo borrar tus datos</h2>
  <p>Puedes borrar tus decks desde tu panel cuando quieras. Para borrar tu cuenta y todo lo que contiene, abre una issue en <a href="https://github.com/Aegisystem/Sliding/issues">github.com/Aegisystem/Sliding</a> y la borramos en menos de 30 días.</p>

  <footer><a href="/">Sliding</a></footer>
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
