import { html } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import type { User } from "./auth/users";
import type { Limits } from "./decks/limits";
import type { DeckRow, Usage } from "./decks/store";

type Html = HtmlEscapedString | Promise<HtmlEscapedString>;

const FONT = "/fonts/archivo-latin-wdth.woff2";

// ── Piezas comunes ────────────────────────────────────────────────────────

/** Las páginas de presentaciones no se indexan: su enlace no está listado. */
const head = (title: string, { index = false, styled = true } = {}) => html`<meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${index ? "" : html`<meta name="robots" content="noindex" />`}
  <title>${title}</title>
  ${styled
    ? html`<link rel="preload" href="${FONT}" as="font" type="font/woff2" crossorigin />
        <link rel="stylesheet" href="/styles.css" />`
    : ""}`;

/** Cabecera corrida, como la de cada página de un programa impreso. */
const runningHead = (user: User | null) => html`<header class="running-head">
  <a class="wordmark" href="/">Sliding</a>
  <nav class="running-nav" aria-label="Principal">
    ${user
      ? html`<a href="/panel">Tu panel</a>
          <span class="running-user">
            ${user.avatarUrl ? html`<img src="${user.avatarUrl}" alt="" width="24" height="24" referrerpolicy="no-referrer" />` : ""}
            <span>${user.name}</span>
          </span>
          <form method="post" action="/auth/logout"><button type="submit">Cerrar sesión</button></form>`
      : html`<a href="/#entrar">Entrar</a>`}
  </nav>
</header>`;

const footer = () => html`<footer class="colophon">
  <p>Sliding. Tus presentaciones HTML, desde el celular.</p>
  <p><a href="/privacidad">Privacidad</a> · <a href="https://github.com/Aegisystem/Sliding">Código en GitHub</a></p>
</footer>`;

const layout = ({
  title,
  user,
  body,
  page,
  index = false,
}: {
  title: string;
  user: User | null;
  body: Html;
  page: string;
  index?: boolean;
}) => html`<!doctype html>
<html lang="es">
<head>
  ${head(title, { index })}
</head>
<body class="page-${page}">
  <a class="skip" href="#contenido">Saltar al contenido</a>
  ${runningHead(user)}
  <main id="contenido">${body}</main>
  ${footer()}
  <script src="/app.js" defer></script>
</body>
</html>`;

const githubMark = html`<svg class="mark" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>`;

const googleMark = html`<svg class="mark" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;

const number = new Intl.NumberFormat("es", { maximumFractionDigits: 1 });
const day = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", timeZone: "UTC" });

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 MB";
  if (bytes < 1024 * 1024) return `${number.format(Math.max(1, Math.round(bytes / 1024)))} KB`;
  return `${number.format(bytes / (1024 * 1024))} MB`;
}
const mb = (bytes: number) => number.format(bytes / (1024 * 1024));

// ── Portada ───────────────────────────────────────────────────────────────

const LOGIN_ERRORS: Record<string, string> = {
  login: "No se pudo iniciar sesión. Intenta de nuevo.",
  disabled: "Tu cuenta está desactivada.",
};

/** La credencial colgada de su cinta: el control para entrar y, ya dentro, tu identidad. */
const hangingBadge = (inner: Html, { id, variant }: { id?: string; variant: "cover" | "panel" }) => html`<div
  class="badge-hang badge-hang-${variant}"
  ${id ? html`id="${id}"` : ""}
>
  <span class="lanyard" aria-hidden="true"></span>
  <section class="badge" aria-labelledby="badge-name">
    <span class="badge-slot" aria-hidden="true"></span>
    ${inner}
    <p class="badge-role">Presentador</p>
  </section>
</div>`;

const badgePhoto = (user: User) =>
  user.avatarUrl
    ? html`<img class="badge-photo" src="${user.avatarUrl}" alt="" width="64" height="64" referrerpolicy="no-referrer" />`
    : "";

const coverBadge = (user: User | null, error?: string) =>
  hangingBadge(
    user
      ? html`${badgePhoto(user)}
          <h2 class="badge-name" id="badge-name">Hola, ${user.name}.</h2>
          <div class="badge-actions">
            <a class="btn btn-ink" href="/panel">Ir a tu panel</a>
            <form method="post" action="/auth/logout"><button class="btn" type="submit">Cerrar sesión</button></form>
          </div>`
      : html`<h2 class="badge-name" id="badge-name">Hola.</h2>
          <p class="badge-note">Entra para subir tus presentaciones.</p>
          ${error && LOGIN_ERRORS[error] ? html`<p class="badge-error" role="alert">${LOGIN_ERRORS[error]}</p>` : ""}
          <div class="badge-actions">
            <a class="btn btn-ink" href="/auth/github">${githubMark}<span>Entrar con GitHub</span></a>
            <a class="btn" href="/auth/google">${googleMark}<span>Entrar con Google</span></a>
          </div>`,
    { id: "entrar", variant: "cover" },
  );

export const homePage = ({ user, error, limits }: { user: User | null; error?: string; limits: Limits }) =>
  layout({
    title: "Sliding",
    user,
    page: "home",
    index: true,
    body: html`<div class="cover">
        <div class="cover-top">
          <h1 class="cover-title">Sliding</h1>
          <p class="cover-lead">Sube tu presentación HTML y queda publicada, sin desplegar nada. Para presentarla, tu celular se vuelve el control.</p>
        </div>
        <div class="cover-tracks">
        ${coverBadge(user, error)}
        <ol class="tracks" aria-label="El día de tu charla">
          <li class="track track-azul">
            <h2>Antes de la charla</h2>
            <p>Sube tu presentación: un solo archivo .html de hasta ${mb(limits.deckBytes)} MB. Si la hiciste con html-slides, Sliding entiende sus diapositivas y sus notas.</p>
          </li>
          <li class="track track-naranja">
            <h2>Al empezar</h2>
            <p>Abre tu Enlace para presentar en el computador del lugar y escanea el QR con tu celular.</p>
            <span class="stamp">Por confirmar</span>
          </li>
          <li class="track track-verde">
            <h2>Durante</h2>
            <p>Avanza desde el celular con tus notas, el cronómetro y la diapositiva que sigue. El público solo ve la presentación.</p>
            <span class="stamp">Por confirmar</span>
          </li>
          <li class="track track-amarillo">
            <h2>Después</h2>
            <p>Comparte el enlace de la presentación: cualquiera la ve sin cuenta y sin tus notas.</p>
          </li>
        </ol>
        </div>
      </div>
      <section class="info" aria-labelledby="info-title">
        <h2 id="info-title">Información general</h2>
        <dl class="info-rows">
          <div>
            <dt>Formatos</dt>
            <dd>Cualquier presentación de un solo archivo HTML. Con html-slides tienes control de cada diapositiva y tus notas; con el resto, anterior y siguiente.</dd>
          </div>
          <div>
            <dt>Espacio</dt>
            <dd>Hasta ${limits.decksPerOwner} presentaciones y ${mb(limits.bytesPerOwner)} MB por persona, con ${mb(limits.deckBytes)} MB como máximo por presentación.</dd>
          </div>
          <div>
            <dt>Privacidad</dt>
            <dd>Tus presentaciones no aparecen en buscadores ni en listas: solo las ve quien tiene el enlace. Tus notas nunca llegan a la pantalla del público.</dd>
          </div>
          <div>
            <dt>Agentes</dt>
            <dd>Por confirmar: Claude y otros agentes podrán subir presentaciones por ti con un token.</dd>
          </div>
          <div>
            <dt>Precio</dt>
            <dd>Gratis.</dd>
          </div>
        </dl>
      </section>`,
  });

// ── Panel ─────────────────────────────────────────────────────────────────

const PANEL_OK: Record<string, string> = {
  subido: "Presentación subida. Ya puedes compartir su enlace.",
  reemplazado: "Presentación reemplazada. Su enlace sigue siendo el mismo.",
  borrado: "Presentación borrada. Su enlace ya no funciona.",
};

const panelError = (code: string, usage: Usage, limits: Limits): string | null =>
  ({
    vacio: "Elige un archivo antes de subir.",
    "no-html": "Sliding solo acepta archivos .html.",
    "muy-grande": `El archivo pasa de ${mb(limits.deckBytes)} MB. Reduce sus imágenes y vuelve a subirlo.`,
    "cupo-decks": `Ya tienes ${limits.decksPerOwner} presentaciones. Borra una para subir otra.`,
    "cupo-espacio": `No queda espacio: tus presentaciones ocupan ${formatBytes(usage.bytes)} de ${mb(limits.bytesPerOwner)} MB. Borra alguna o reduce sus imágenes.`,
    "no-existe": "Esa presentación no existe o no es tuya.",
  })[code] ?? null;

const room = (label: string, url: string, note: string) => html`<div class="room">
  <span class="room-label">${label}</span>
  <a class="room-url" href="${url}" target="_blank" rel="noopener">${url.replace(/^https?:\/\//, "")}</a>
  <span class="room-note">${note}</span>
  <button class="btn btn-small copy" type="button" data-copy="${url}">Copiar</button>
</div>`;

const session = (deck: DeckRow, origin: string) => html`<li class="session">
  <div class="session-code ${deck.kind === "html-slides" ? "track-azul" : "track-amarillo"}">
    ${deck.kind === "html-slides"
      ? html`<span class="session-count num">${deck.slideCount ?? 0}</span><span class="session-unit">${deck.slideCount === 1 ? "diapositiva" : "diapositivas"}</span>`
      : html`<span class="session-count session-count-word">HTML</span><span class="session-unit">genérica</span>`}
  </div>
  <div class="session-main">
    <h2 class="session-title">${deck.title}</h2>
    <p class="session-meta">
      ${deck.kind === "html-slides" ? "html-slides" : "HTML genérico"} ·
      <span class="num">${formatBytes(deck.size)}</span> · actualizada el ${day.format(deck.updatedAt)}
    </p>
  </div>
  <div class="session-rooms">
    ${room("Enlace de la presentación", `${origin}/d/${deck.id}`, "Para el público: sin tus notas.")}
    ${room("Enlace para presentar", `${origin}/p/${deck.presentSecret}`, "Solo para ti: no lo compartas.")}
  </div>
  <div class="session-actions">
    <form class="replace" method="post" action="/panel/decks/${deck.id}" enctype="multipart/form-data">
      <label class="btn btn-small">
        Reemplazar
        <input class="visually-hidden" type="file" name="file" accept=".html,.htm,text/html" required />
      </label>
      <noscript><button class="btn btn-small" type="submit">Subir reemplazo</button></noscript>
    </form>
    <form class="delete" method="post" action="/panel/decks/${deck.id}/delete" data-title="${deck.title}">
      <button class="btn btn-small btn-danger" type="submit">Borrar</button>
    </form>
  </div>
</li>`;

export const panelPage = ({
  user,
  decks,
  usage,
  limits,
  origin,
  ok,
  error,
}: {
  user: User;
  decks: DeckRow[];
  usage: Usage;
  limits: Limits;
  origin: string;
  ok?: string;
  error?: string;
}) => {
  const okText = ok ? PANEL_OK[ok] : undefined;
  const errorText = error ? panelError(error, usage, limits) : null;
  const full = usage.decks >= limits.decksPerOwner;
  return layout({
    title: "Tu panel · Sliding",
    user,
    page: "panel",
    body: html`<div class="panel-head">
        <div class="panel-intro">
          <h1>Tus presentaciones</h1>
          <form class="upload" method="post" action="/panel/decks" enctype="multipart/form-data">
            <label class="btn btn-ink">
              Subir una presentación .html
              <input class="visually-hidden" type="file" name="file" accept=".html,.htm,text/html" required ${full ? "disabled" : ""} />
            </label>
            <span class="upload-file" aria-live="polite">${full
              ? `Tienes ${limits.decksPerOwner} presentaciones: borra una para subir otra.`
              : `Hasta ${mb(limits.deckBytes)} MB. También puedes soltarla en esta página.`}</span>
            <noscript><button class="btn" type="submit" ${full ? "disabled" : ""}>Subir</button></noscript>
          </form>
        </div>
        ${hangingBadge(
          html`${badgePhoto(user)}
            <h2 class="badge-name" id="badge-name">${user.name}</h2>
            <p class="badge-quota">
              <span class="num">${usage.decks}</span> de <span class="num">${limits.decksPerOwner}</span> presentaciones<br />
              <span class="num">${formatBytes(usage.bytes)}</span> de <span class="num">${mb(limits.bytesPerOwner)}</span> MB
            </p>`,
          { variant: "panel" },
        )}
      </div>
      ${okText ? html`<p class="flash flash-ok" role="status">${okText}</p>` : ""}
      ${errorText ? html`<p class="flash flash-error" role="alert">${errorText}</p>` : ""}
      ${decks.length
        ? html`<ol class="program" aria-label="Tus presentaciones">${decks.map((deck) => session(deck, origin))}</ol>`
        : html`<div class="empty">
            <h2>Tu programa está vacío.</h2>
            <p>Sube tu primera presentación con el botón de arriba. ¿Todavía no tienes una? Pídele a Claude una presentación con la skill html-slides, o usa cualquier HTML de un solo archivo.</p>
          </div>`}`,
  });
};

// ── Enlace para presentar ─────────────────────────────────────────────────

export const presentPage = ({ user, title, deckUrl }: { user: User | null; title: string; deckUrl: string }) =>
  layout({
    title: `Presentar ${title} · Sliding`,
    user,
    page: "notice",
    body: html`<section class="band track-naranja">
      <div class="band-inner">
        <h1>Presentar «${title}»</h1>
        <p>La Pantalla con el QR de control llega en la próxima versión. Mientras tanto, puedes mostrar la presentación a pantalla completa desde su enlace.</p>
        <p><a class="btn btn-ink" href="${deckUrl}">Abrir la presentación</a></p>
      </div>
      <span class="stamp">Por confirmar</span>
    </section>`,
  });

// ── Privacidad ────────────────────────────────────────────────────────────

export const privacyPage = ({ user }: { user: User | null }) =>
  layout({
    title: "Privacidad · Sliding",
    user,
    page: "read",
    index: true,
    body: html`<header class="read-band track-azul">
        <div class="read-band-inner">
          <h1>Privacidad</h1>
          <p class="read-date">Última actualización: 18 de noviembre de 2026.</p>
        </div>
      </header>
      <article class="read">
      <p class="read-lead">Sliding es un sitio para subir presentaciones HTML y presentarlas con el celular. Esta página dice qué datos guarda, para qué y cómo borrarlos.</p>

      <h2>Qué guardamos</h2>
      <ul>
        <li><strong>Tu cuenta.</strong> Al entrar con GitHub o Google guardamos el identificador de tu cuenta en ese servicio, tu nombre y tu correo. Los usamos para mostrarte tus presentaciones y para avisarte si hay un problema con ellas.</li>
        <li><strong>Tus presentaciones.</strong> Guardamos los archivos HTML que subes y sus notas del presentador. Cualquiera con el enlace de una presentación puede verla, pero sin las notas.</li>
        <li><strong>Tus tokens.</strong> Si creas tokens para que un agente suba presentaciones por ti, guardamos solo una huella de cada token, su nombre y la última vez que se usó.</li>
        <li><strong>Las presentaciones en vivo.</strong> Mientras presentas guardamos en qué diapositiva vas. Se borra cuando termina la sesión.</li>
      </ul>

      <h2>Cookies</h2>
      <p>Usamos una sola cookie, para que no tengas que iniciar sesión en cada visita. No usamos cookies de publicidad ni de analítica.</p>

      <h2>Con quién compartimos tus datos</h2>
      <p>Con nadie. Los datos viven en Cloudflare, que aloja el sitio. GitHub y Google solo intervienen cuando inicias sesión con ellos.</p>

      <h2>Cómo borrar tus datos</h2>
      <p>Puedes borrar tus presentaciones desde tu panel cuando quieras. Para borrar tu cuenta y todo lo que contiene, abre una issue en <a href="https://github.com/Aegisystem/Sliding/issues">github.com/Aegisystem/Sliding</a> y la borramos en menos de 30 días.</p>
    </article>`,
  });

// ── Errores y Enlace de la presentación ─────────────────────────────────────────────

export const notFoundPage = (user: User | null = null) =>
  layout({
    title: "Presentación no encontrada · Sliding",
    user,
    page: "notice",
    body: html`<section class="band track-naranja">
      <div class="band-inner">
        <h1>Presentación no encontrada</h1>
        <p>Esta sesión no está en el programa. Revisa el enlace; si la presentación existía, puede que su Dueño la haya borrado.</p>
        <p><a class="btn btn-ink" href="/">Ir a la portada</a></p>
      </div>
      <span class="stamp">Cancelada</span>
    </section>`,
  });

/**
 * Página del Enlace de la presentación: ocupa toda la ventana, servida desde su
 * propio origen. Sliding no le pone nada encima (la presentación es del Dueño).
 */
export const viewerPage = ({ title, src }: { title: string; src: string }) => html`<!doctype html>
<html lang="es">
<head>
  ${head(`${title} · Sliding`, { styled: false })}
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
    // El teclado mueve la presentación solo si el iframe tiene el foco.
    const frame = document.querySelector("iframe");
    frame.addEventListener("load", () => frame.focus());
  </script>
</body>
</html>`;
