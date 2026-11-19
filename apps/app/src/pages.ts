import { html } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import type { User } from "./auth/users";
import type { Limits } from "./decks/limits";
import type { DeckRow, PublicDeck, Usage } from "./decks/store";
import { descendantsOf, type Folder } from "./folders/store";
import type { Found, ModDeck, ModOwner } from "./moderation/store";

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
  <p>Sliding. Tus presentaciones, desde el celular.</p>
  <p><a href="/skill">Skill para tu IA</a> · <a href="/privacidad">Privacidad</a> · <a href="https://github.com/Aegisystem/Sliding">Código en GitHub</a></p>
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
          <p class="cover-lead">Sube tu presentación HTML o PDF y queda publicada, sin desplegar nada. Para presentarla, tu celular se vuelve el control.</p>
        </div>
        <div class="cover-tracks">
        ${coverBadge(user, error)}
        <ol class="tracks" aria-label="El día de tu charla">
          <li class="track track-azul">
            <h2>Antes de la charla</h2>
            <p>Sube tu presentación: un archivo .html o .pdf de hasta ${mb(limits.deckBytes)} MB. ¿Es de PowerPoint? Elige el PDF junto con el .pptx y Sliding lee tus notas.</p>
          </li>
          <li class="track track-naranja">
            <h2>Al empezar</h2>
            <p>Abre tu Enlace para presentar en el computador del lugar y escanea el QR con tu celular.</p>
          </li>
          <li class="track track-verde">
            <h2>Durante</h2>
            <p>Avanza desde el celular con tus notas, el cronómetro y la diapositiva que sigue. El público solo ve la presentación.</p>
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
            <dd>Un archivo HTML, o el PDF que exportas de PowerPoint, Keynote o Google Slides. Con html-slides y con PDF controlas cada diapositiva. Tus notas salen de html-slides o del .pptx que eliges junto al PDF. Con otro HTML, tienes anterior y siguiente.</dd>
          </div>
          <div>
            <dt>Ayuda</dt>
            <dd>¿Cómo hago una presentación? Pásale a tu IA la <a href="/skill">skill html-slides</a> y pídesela: queda lista para subir.</dd>
          </div>
          <div>
            <dt>Carpetas</dt>
            <dd>Ordena tus presentaciones por curso, unidad o semana, en carpetas dentro de carpetas. Comparte una carpeta entera con un solo enlace.</dd>
          </div>
          <div>
            <dt>Espacio</dt>
            <dd>Todas las presentaciones que quieras, mientras sumen hasta ${mb(limits.bytesPerOwner)} MB, con ${mb(limits.deckBytes)} MB como máximo cada una.</dd>
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
  notas: "Notas guardadas. Las verás en el celular al presentar.",
  borrado: "Presentación borrada. Su enlace ya no funciona.",
  movido: "Presentación movida. Su enlace sigue siendo el mismo.",
  "carpeta-creada": "Carpeta creada.",
  "carpeta-renombrada": "Nombre guardado.",
  "carpeta-movida": "Carpeta movida.",
  "carpeta-borrada": "Carpeta borrada. Lo que tenía dentro quedó aquí.",
};

const panelError = (code: string, usage: Usage, limits: Limits): string | null =>
  ({
    vacio: "Elige un archivo antes de subir.",
    formato: "Sliding acepta archivos .html y .pdf. Si tu presentación es de PowerPoint, Keynote o Google Slides, expórtala como PDF.",
    "no-pdf": "Ese archivo no es un PDF válido. Expórtalo otra vez desde tu programa de presentaciones.",
    notas: "No se pudieron leer las notas de ese .pptx. Ábrelo en PowerPoint, guárdalo otra vez y vuelve a intentarlo.",
    "muy-grande": `El archivo pasa de ${mb(limits.deckBytes)} MB. Reduce sus imágenes y vuelve a subirlo.`,
    "cupo-espacio": `No queda espacio: tus presentaciones ocupan ${formatBytes(usage.bytes)} de ${mb(limits.bytesPerOwner)} MB. Borra alguna o reduce sus imágenes.`,
    "no-existe": "Esa presentación o carpeta no existe, o no es tuya.",
    nombre: "Escribe un nombre para la carpeta, de hasta 80 caracteres.",
    ciclo: "Una carpeta no puede ir dentro de sí misma ni de una de sus carpetas.",
  })[code] ?? null;

/** Una carpeta en la lista del panel, con lo que tiene dentro. */
export interface FolderRow extends Folder {
  decks: number;
  folders: number;
}

/** Todas las carpetas en orden de árbol, cada una con su ruta: «Física / Unidad 1». */
function folderTree(folders: Folder[]): { folder: Folder; label: string }[] {
  const out: { folder: Folder; label: string }[] = [];
  const seen = new Set<string>();
  const walk = (parentId: string | null, prefix: string) => {
    for (const folder of folders) {
      if (folder.parentId !== parentId || seen.has(folder.id)) continue;
      seen.add(folder.id);
      const label = prefix ? `${prefix} / ${folder.name}` : folder.name;
      out.push({ folder, label });
      walk(folder.id, label);
    }
  };
  walk(null, "");
  return out;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** El formulario vuelve a la carpeta que se está viendo. */
const backField = (name: string, folderId: string | null) =>
  folderId ? html`<input type="hidden" name="${name}" value="${folderId}" />` : "";

/** «Mover a»: elegir la carpeta ya mueve (sin JS, con su botón). */
const moveForm = ({
  id,
  action,
  title,
  options,
  folderId,
}: {
  id: string;
  action: string;
  title: string;
  options: { value: string; label: string; here: boolean }[];
  folderId: string | null;
}) =>
  options.some((o) => !o.here)
    ? html`<form class="move" method="post" action="${action}">
        ${backField("volver", folderId)}
        <label class="visually-hidden" for="mover-${id}">Mover «${title}» a otra carpeta</label>
        <select class="select" id="mover-${id}" name="destino" required>
          <option value="" selected disabled>Mover a…</option>
          ${options.map(
            (o) => html`<option value="${o.value}" ${o.here ? "disabled" : ""}>${o.label}${o.here ? " (aquí)" : ""}</option>`,
          )}
        </select>
        <noscript><button class="btn btn-small" type="submit">Mover</button></noscript>
      </form>`
    : "";

/**
 * Subir y Bajar, arriba y abajo del código de la hilera. Con el mouse también
 * se puede arrastrar el código. Solo con JS y con dos hileras o más.
 */
const orderButton = (dir: "up" | "down", name: string) => html`<button class="order order-${dir}" type="button" data-move="${dir}" hidden aria-describedby="orden-ayuda" aria-label="${dir === "up" ? "Subir" : "Bajar"} «${name}»">
  <svg viewBox="0 0 16 10" width="16" height="10" aria-hidden="true" focusable="false"><path d="${dir === "up" ? "M2 8.5l6-6 6 6" : "M2 1.5l6 6 6-6"}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
</button>`;

/** La señal de que la hilera se arrastra: seis puntos a la derecha. En el celular, tomarla de ahí la levanta al instante. El teclado usa Subir, Bajar y «Mover a». */
const dragHint = html`<span class="drag-hint" title="Arrastra para ordenar o meter en una carpeta" aria-hidden="true">
  <svg viewBox="0 0 12 20" width="12" height="20" focusable="false"><circle cx="3" cy="4" r="1.75"/><circle cx="9" cy="4" r="1.75"/><circle cx="3" cy="10" r="1.75"/><circle cx="9" cy="10" r="1.75"/><circle cx="3" cy="16" r="1.75"/><circle cx="9" cy="16" r="1.75"/></svg>
</span>`;

/** Un título de hilera: h3 bajo los rótulos «Carpetas» y «Presentaciones», h2 si no hay rótulos. */
const rowTitle = (level: 2 | 3, inner: Html | string) =>
  level === 3 ? html`<h3 class="session-title">${inner}</h3>` : html`<h2 class="session-title">${inner}</h2>`;

interface PanelContext {
  origin: string;
  folderId: string | null;
  tree: { folder: Folder; label: string }[];
  folders: Folder[];
  level: 2 | 3;
}

/** El color de cada tipo de presentación en su cuadro de código. */
const TRACK: Record<DeckRow["kind"], string> = { "html-slides": "track-azul", pdf: "track-naranja", generic: "track-amarillo" };

/** Lo que va en el cuadro de código: cuántas diapositivas tiene o, si no se sabe, su formato. */
const deckCount = (deck: Pick<DeckRow, "kind" | "slideCount">) =>
  deck.kind === "html-slides" || (deck.kind === "pdf" && deck.slideCount)
    ? html`<span class="session-count num">${deck.slideCount ?? 0}</span><span class="session-unit">${plural(deck.slideCount ?? 0, "diapositiva", "diapositivas")}</span>`
    : deck.kind === "pdf"
      ? html`<span class="session-count session-count-word">PDF</span><span class="session-unit">presentación</span>`
      : html`<span class="session-count session-count-word">HTML</span><span class="session-unit">genérica</span>`;

const KIND_LABEL: Record<DeckRow["kind"], string> = { "html-slides": "html-slides", pdf: "PDF", generic: "HTML genérico" };

/** El PDF y las notas del .pptx se emparejan por número: si no tienen las mismas diapositivas, se avisa. */
const notesMismatch = (deck: DeckRow) =>
  deck.kind === "pdf" && deck.notesCount !== null && deck.slideCount !== null && deck.notesCount !== deck.slideCount;

const pptxAccept = ".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation";
const deckAccept = `.html,.htm,text/html,.pdf,application/pdf,${pptxAccept}`;

/**
 * «Agregar notas» de una Presentación en PDF. El .pptx no tiene `name`: nunca
 * se sube. app.js lo lee y deja sus notas en el campo `notas`, así que sin JS
 * el formulario no aparece.
 */
const notesForm = (deck: DeckRow, ctx: PanelContext) => html`<form class="add-notes" method="post" action="/panel/decks/${deck.id}/notas" enctype="multipart/form-data" data-needs-js hidden>
  ${backField("volver", ctx.folderId)}
  <input type="hidden" name="notas" />
  <label class="btn btn-small">
    ${deck.notesCount === null ? "Agregar notas" : "Cambiar notas"}
    <input class="visually-hidden" type="file" accept="${pptxAccept}" data-pptx aria-describedby="pptx-${deck.id}" />
  </label>
  <span class="visually-hidden" id="pptx-${deck.id}">Elige el .pptx de esta presentación. Solo se leen sus notas: el archivo no se sube.</span>
</form>`;

const deckRow = (deck: DeckRow, ctx: PanelContext) => html`<li class="session${deck.disabled ? " is-disabled" : ""}" data-id="${deck.id}">
  <div class="session-code ${TRACK[deck.kind]}">
    ${orderButton("up", deck.title)}
    ${deckCount(deck)}
    ${orderButton("down", deck.title)}
  </div>
  <div class="session-main">
    ${dragHint}
    ${rowTitle(ctx.level, deck.title)}
    <p class="session-meta">
      ${KIND_LABEL[deck.kind]} ·
      ${deck.kind === "pdf" ? html`${deck.notesCount === null ? "sin notas" : "con notas"} · ` : ""}
      <span class="num">${formatBytes(deck.size)}</span> · actualizada el ${day.format(deck.updatedAt)}
    </p>
    ${notesMismatch(deck)
      ? html`<p class="session-warn">Las notas no coinciden: el .pptx tiene <span class="num">${deck.notesCount}</span> ${plural(deck.notesCount ?? 0, "diapositiva visible", "diapositivas visibles")} y el PDF <span class="num">${deck.slideCount}</span>. Revisa que sean la misma versión.</p>`
      : ""}
  </div>
  <div class="session-go">
    ${deck.disabled
      ? // La desactivó el administrador (#11): sus enlaces dan 404, así que no se ofrecen.
        html`<p class="session-off"><strong>Desactivada.</strong> Nadie puede verla ni presentarla. La desactivó la moderación de Sliding.</p>`
      : html`<a class="btn btn-ink" href="/p/${deck.presentSecret}" target="_blank" rel="noopener">Presentar con control</a>
          <a class="btn" href="/d/${deck.id}" target="_blank" rel="noopener">Ver diapositivas</a>
          <button class="btn btn-small copy" type="button" data-copy="${ctx.origin}/d/${deck.id}">Copiar enlace para compartir</button>`}
  </div>
  <div class="session-actions">
    ${deck.disabled
      ? ""
      : html`<form class="replace" method="post" action="/panel/decks/${deck.id}" enctype="multipart/form-data" data-deck-form>
          ${backField("volver", ctx.folderId)}
          <input type="hidden" name="notas" />
          <label class="btn btn-small">
            Reemplazar
            <input class="visually-hidden" type="file" name="file" accept="${deckAccept}" multiple required />
          </label>
          <noscript><button class="btn btn-small" type="submit">Subir reemplazo</button></noscript>
        </form>
        ${deck.kind === "pdf" ? notesForm(deck, ctx) : ""}`}
    ${moveForm({
      id: deck.id,
      action: `/panel/decks/${deck.id}/mover`,
      title: deck.title,
      folderId: ctx.folderId,
      options: [
        { value: "raiz", label: "Sin carpeta", here: ctx.folderId === null },
        ...ctx.tree.map(({ folder, label }) => ({ value: folder.id, label, here: folder.id === ctx.folderId })),
      ],
    })}
    <form class="delete" method="post" action="/panel/decks/${deck.id}/delete" data-confirm="¿Borrar «${deck.title}»? Su enlace dejará de funcionar y no se puede deshacer.">
      ${backField("volver", ctx.folderId)}
      <button class="btn btn-small btn-danger" type="submit">Borrar</button>
    </form>
  </div>
</li>`;

const folderRow = (folder: FolderRow, ctx: PanelContext) => {
  const inside = descendantsOf(ctx.folders, folder.id);
  return html`<li class="session session-folder" data-id="${folder.id}" data-decks="${folder.decks}" data-folders="${folder.folders}">
  <div class="session-code track-verde">
    ${orderButton("up", folder.name)}
    <span class="session-count num">${folder.decks}</span><span class="session-unit">${plural(folder.decks, "presentación", "presentaciones")}</span>
    ${orderButton("down", folder.name)}
  </div>
  <div class="session-main">
    ${dragHint}
    ${rowTitle(ctx.level, html`<a href="/panel/f/${folder.id}">${folder.name}</a>`)}
    <p class="session-meta">
      Carpeta${folder.folders
        ? html` · <span class="num">${folder.folders}</span> ${plural(folder.folders, "carpeta", "carpetas")} dentro`
        : ""}
    </p>
  </div>
  <div class="session-go">
    <a class="btn btn-ink" href="/panel/f/${folder.id}">Abrir carpeta</a>
    <button class="btn btn-small copy" type="button" data-copy="${ctx.origin}/f/${folder.id}">Copiar enlace para compartir</button>
  </div>
  <div class="session-actions">
    ${moveForm({
      id: folder.id,
      action: `/panel/carpetas/${folder.id}/mover`,
      title: folder.name,
      folderId: ctx.folderId,
      options: [
        { value: "raiz", label: "Sin carpeta", here: ctx.folderId === null },
        ...ctx.tree
          .filter(({ folder: f }) => !inside.has(f.id))
          .map(({ folder: f, label }) => ({ value: f.id, label, here: f.id === ctx.folderId })),
      ],
    })}
    <form class="delete" method="post" action="/panel/carpetas/${folder.id}/borrar" data-confirm="¿Borrar la carpeta «${folder.name}»? Lo que tiene dentro quedará aquí y su enlace dejará de funcionar.">
      <button class="btn btn-small btn-danger" type="submit">Borrar</button>
    </form>
  </div>
</li>`;
};

/** Lo que se hace con la carpeta abierta: compartirla, verla como los demás, renombrarla y borrarla. */
const folderTools = (folder: Folder, parentName: string, origin: string) => html`<div class="folder-tools">
  <button class="btn btn-small copy" type="button" data-copy="${origin}/f/${folder.id}">Copiar enlace de la carpeta</button>
  <a class="btn btn-small" href="/f/${folder.id}" target="_blank" rel="noopener">Ver como la ven los demás</a>
  <button class="btn btn-small" type="button" data-rename-toggle aria-expanded="false" aria-controls="renombrar" hidden>Cambiar nombre</button>
  <form class="delete" method="post" action="/panel/carpetas/${folder.id}/borrar" data-confirm="¿Borrar la carpeta «${folder.name}»? Lo que tiene dentro pasará a «${parentName}» y su enlace dejará de funcionar.">
    <button class="btn btn-small btn-danger" type="submit">Borrar carpeta</button>
  </form>
</div>
<form class="rename" id="renombrar" method="post" action="/panel/carpetas/${folder.id}/nombre">
  <label for="nombre-carpeta">Nombre de la carpeta</label>
  <input class="field" id="nombre-carpeta" name="nombre" value="${folder.name}" maxlength="80" required autocomplete="off" />
  <button class="btn btn-small btn-ink" type="submit">Guardar nombre</button>
</form>`;

export const panelPage = ({
  user,
  decks,
  usage,
  limits,
  origin,
  ok,
  error,
  folder = null,
  path = [],
  children = [],
  folders = [],
}: {
  user: User;
  decks: DeckRow[];
  usage: Usage;
  limits: Limits;
  origin: string;
  ok?: string;
  error?: string;
  /** La carpeta abierta, o null en la raíz del panel. */
  folder?: Folder | null;
  /** La ruta desde la raíz hasta la carpeta abierta, incluida. */
  path?: Folder[];
  /** Las carpetas que hay aquí. */
  children?: FolderRow[];
  /** Todas las carpetas del Dueño, para «Mover a». */
  folders?: Folder[];
}) => {
  const okText = ok ? PANEL_OK[ok] : undefined;
  const errorText = error ? panelError(error, usage, limits) : null;
  const folderId = folder?.id ?? null;
  const labelled = children.length > 0 && decks.length > 0;
  const ctx: PanelContext = { origin, folderId, tree: folderTree(folders), folders, level: labelled ? 3 : 2 };
  const ancestors = path.slice(0, -1);
  const parentName = ancestors.at(-1)?.name ?? "Tus presentaciones";
  const title = folder ? folder.name : "Tus presentaciones";

  return layout({
    title: `${folder ? `${folder.name} · ` : ""}Tu panel · Sliding`,
    user,
    page: "panel",
    body: html`<div class="panel-head">
        <div class="panel-intro">
          ${folder
            ? html`<nav class="crumbs" aria-label="Carpetas">
                <ol>
                  <li><a href="/panel" data-drop="raiz">Tus presentaciones</a></li>
                  ${ancestors.map((f) => html`<li><a href="/panel/f/${f.id}" data-drop="${f.id}">${f.name}</a></li>`)}
                </ol>
              </nav>`
            : ""}
          <h1>${title}</h1>
          ${folder ? folderTools(folder, parentName, origin) : ""}
          <div class="panel-tools">
            <form class="upload" method="post" action="/panel/decks" enctype="multipart/form-data" data-deck-form>
              ${backField("carpeta", folderId)}
              <input type="hidden" name="notas" />
              <label class="btn btn-ink">
                Subir una presentación
                <input class="visually-hidden" type="file" name="file" accept="${deckAccept}" multiple required aria-describedby="subir-ayuda" />
              </label>
              <span class="upload-file" aria-live="polite">HTML o PDF, hasta ${mb(limits.deckBytes)} MB. También puedes soltarla en esta página.</span>
              <p class="upload-help" id="subir-ayuda">¿Es de PowerPoint? Expórtala como PDF y elige el PDF y el .pptx a la vez: así ves tus notas en el celular. El .pptx no se sube.</p>
              <noscript><button class="btn" type="submit">Subir</button></noscript>
            </form>
            <form class="new-folder" method="post" action="/panel/carpetas">
              ${backField("carpeta", folderId)}
              <label class="visually-hidden" for="nueva-carpeta">Nombre de la carpeta nueva</label>
              <input class="field" id="nueva-carpeta" name="nombre" maxlength="80" required autocomplete="off"
                placeholder="${folder ? "Por ejemplo: Unidad 1" : "Por ejemplo: Física"}" />
              <button class="btn" type="submit">Crear carpeta</button>
            </form>
          </div>
        </div>
        ${hangingBadge(
          html`${badgePhoto(user)}
            <h2 class="badge-name" id="badge-name">${user.name}</h2>
            <p class="badge-quota">
              <span class="num">${usage.decks}</span> ${plural(usage.decks, "presentación", "presentaciones")}<br />
              <span class="num">${formatBytes(usage.bytes)}</span> de <span class="num">${mb(limits.bytesPerOwner)}</span> MB
            </p>`,
          { variant: "panel" },
        )}
      </div>
      <p class="flash flash-error" data-order-error role="alert" hidden>No se pudo guardar el orden. Recarga la página e intenta de nuevo.</p>
      <p class="flash flash-error" data-move-error role="alert" hidden></p>
      <p class="flash flash-error" data-file-error role="alert" hidden></p>
      ${okText ? html`<p class="flash flash-ok" role="status">${okText}</p>` : ""}
      ${errorText ? html`<p class="flash flash-error" role="alert">${errorText}</p>` : ""}
      <div class="panel-lists">
        ${children.length
          ? html`${labelled ? html`<h2 class="program-label">Carpetas</h2>` : ""}
              <ol class="program" aria-label="Carpetas" data-sortable="folders" data-parent="${folderId ?? ""}">
                ${children.map((f) => folderRow(f, ctx))}
              </ol>`
          : ""}
        ${decks.length
          ? html`${labelled ? html`<h2 class="program-label">Presentaciones</h2>` : ""}
              <ol class="program" aria-label="Presentaciones" data-sortable="decks" data-parent="${folderId ?? ""}">
                ${decks.map((deck) => deckRow(deck, ctx))}
              </ol>`
          : ""}
        ${folder
            ? html`<div class="empty" data-empty ${children.length || decks.length ? "hidden" : ""}>
                <h2>Esta carpeta está vacía.</h2>
                <p>Sube aquí una presentación, crea una carpeta dentro (una unidad, una semana) o trae presentaciones que ya subiste con «Mover a».</p>
              </div>`
            : html`<div class="empty" data-empty ${children.length || decks.length ? "hidden" : ""}>
                <h2>Tu programa está vacío.</h2>
                <p>Sube tu primera presentación con el botón de arriba. ¿Todavía no tienes una? Pásale a tu IA la <a href="/skill">skill html-slides</a> y pídele una, o usa cualquier HTML de un solo archivo. Para ordenarlas por curso, crea una carpeta.</p>
              </div>`}
      </div>
      <p class="visually-hidden" id="orden-ayuda">Cambia el orden en que la ven los demás. También puedes arrastrar la hilera, con el mouse o manteniendo el dedo sobre ella, y soltarla en una carpeta.</p>
      <p class="visually-hidden" data-order-status role="status"></p>`,
  });
};

// ── Enlace de la carpeta ──────────────────────────────────────────────────

/** Lo que ve quien tiene el Enlace de la carpeta: sus carpetas y presentaciones, sin notas ni opción de presentar. */
export const folderPage = ({
  user,
  folder,
  path,
  root,
  children,
  decks,
}: {
  user: User | null;
  folder: Folder;
  /** La ruta desde la carpeta por la que se entró hasta esta, incluida. */
  path: Folder[];
  /** La carpeta por la que se entró: los enlaces de más adentro la recuerdan. */
  root: string;
  children: FolderRow[];
  decks: PublicDeck[];
}) => {
  const via = (id: string) => (id === root ? `/f/${id}` : `/f/${id}?desde=${root}`);
  const level = children.length > 0 && decks.length > 0 ? 3 : 2;
  return layout({
    title: `${folder.name} · Sliding`,
    user,
    page: "folder",
    body: html`<header class="folder-band track-verde">
        <div class="folder-band-inner">
          ${path.length > 1
            ? html`<nav class="crumbs" aria-label="Carpetas">
                <ol>
                  ${path.slice(0, -1).map((f) => html`<li><a href="${via(f.id)}">${f.name}</a></li>`)}
                </ol>
              </nav>`
            : ""}
          <h1>${folder.name}</h1>
          <p class="folder-sub">
            <span class="num">${decks.length}</span> ${plural(decks.length, "presentación", "presentaciones")}${children.length
              ? html` · <span class="num">${children.length}</span> ${plural(children.length, "carpeta", "carpetas")}`
              : ""}
          </p>
        </div>
      </header>
      <div class="folder-body">
        ${children.length
          ? html`${level === 3 ? html`<h2 class="program-label">Carpetas</h2>` : ""}
              <ol class="program" aria-label="Carpetas">
                ${children.map(
                  (f) => html`<li class="session session-public">
                    <div class="session-code track-verde">
                      <span class="session-count num">${f.decks}</span><span class="session-unit">${plural(f.decks, "presentación", "presentaciones")}</span>
                    </div>
                    <div class="session-main">
                      ${rowTitle(level, html`<a href="${via(f.id)}">${f.name}</a>`)}
                      <p class="session-meta">
                        Carpeta${f.folders ? html` · <span class="num">${f.folders}</span> ${plural(f.folders, "carpeta", "carpetas")} dentro` : ""}
                      </p>
                    </div>
                    <div class="session-go"><a class="btn" href="${via(f.id)}">Abrir carpeta</a></div>
                  </li>`,
                )}
              </ol>`
          : ""}
        ${decks.length
          ? html`${level === 3 ? html`<h2 class="program-label">Presentaciones</h2>` : ""}
              <ol class="program" aria-label="Presentaciones">
                ${decks.map(
                  (deck) => html`<li class="session session-public">
                    <div class="session-code ${TRACK[deck.kind]}">${deckCount(deck)}</div>
                    <div class="session-main">
                      ${rowTitle(level, html`<a href="/d/${deck.id}">${deck.title}</a>`)}
                      <p class="session-meta">Actualizada el ${day.format(deck.updatedAt)}</p>
                    </div>
                    <div class="session-go"><a class="btn btn-ink" href="/d/${deck.id}">Ver presentación</a></div>
                  </li>`,
                )}
              </ol>`
          : ""}
        ${children.length || decks.length
          ? ""
          : html`<div class="empty"><h2>Esta carpeta todavía está vacía.</h2><p>Cuando tenga presentaciones, aparecerán aquí.</p></div>`}
      </div>`,
  });
};

// ── Sesión en vivo: Pantalla y Control ────────────────────────────────────

const SANDBOX = "allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-downloads";

/** Página sin cabecera ni pie: la Pantalla y el Control ocupan toda la ventana. */
const bareLayout = ({ title, page, attrs, body, script }: { title: string; page: string; attrs: Html; body: Html; script: string }) =>
  html`<!doctype html>
<html lang="es">
<head>
  ${head(title)}
  <meta name="theme-color" content="#111318" />
</head>
<body class="page-${page}" ${attrs}>
  ${body}
  <script src="${script}" defer></script>
</body>
</html>`;

/**
 * La Pantalla (Enlace para presentar): la presentación a pantalla completa y,
 * encima, la preparación con el QR de control hasta que un celular lo escanea.
 */
export const screenPage = ({
  title,
  secret,
  deckSrc,
  decksOrigin,
}: {
  title: string;
  secret: string;
  deckSrc: string;
  decksOrigin: string;
}) =>
  bareLayout({
    title: `Pantalla · ${title} · Sliding`,
    page: "screen",
    attrs: html`data-secret="${secret}" data-decks-origin="${decksOrigin}"`,
    script: "/pantalla.js",
    body: html`<iframe class="screen-deck" src="${deckSrc}" title="${title}" allow="fullscreen" sandbox="${SANDBOX}"></iframe>
  <section class="prep" data-state="connecting" aria-labelledby="prep-title">
    <div class="prep-info">
      <h1 id="prep-title">${title}</h1>
      <ol class="prep-steps">
        <li>Escanea el QR con tu celular.</li>
        <li>Tu celular se vuelve el control: avanza, retrocede y termina desde ahí.</li>
        <li>Pon la pantalla completa con la tecla F o con este botón.</li>
      </ol>
      <p class="prep-actions">
        <button class="btn" type="button" data-fullscreen>Pantalla completa</button>
        <span class="prep-hint">¿Cambias de celular? Presiona Q para un QR nuevo.</span>
      </p>
      <div class="prep-message" data-message hidden>
        <p class="prep-message-text" data-message-text></p>
        <button class="btn" type="button" data-restart hidden>Empezar otra sesión</button>
      </div>
      <div class="prep-phone">
        <p class="prep-phone-text">Esta es la Pantalla, lo que ve el público. Ábrela en el computador conectado al proyector y escanea su QR con este celular.</p>
        <div class="prep-phone-actions">
          <button class="btn" type="button" data-share>Enviar el enlace a mi computador</button>
          <button class="btn btn-ghost" type="button" data-here>Ver la presentación aquí</button>
        </div>
      </div>
    </div>
    <figure class="prep-qr">
      <div class="qr" data-qr role="img" aria-label="QR de control">Preparando el QR…</div>
      <figcaption>Este QR es el control de tus diapositivas. No lo compartas.</figcaption>
    </figure>
  </section>
  <p class="screen-toast" data-toast role="status" aria-live="polite"></p>`,
  });

/** El Control: lo que ve el Presentador en su celular. Oscuro: se usa con la luz baja. */
export const controlPage = ({ sessionId, decksOrigin }: { sessionId: string; decksOrigin: string }) =>
  bareLayout({
    title: "Control · Sliding",
    page: "control",
    attrs: html`data-session="${sessionId}" data-decks-origin="${decksOrigin}"`,
    script: "/control.js",
    body: html`<header class="control-head">
    <p class="control-title" data-title>Sliding</p>
    <p class="control-count num" data-count aria-live="polite"></p>
  </header>
  <div class="control-meta" data-meta hidden>
    <p class="control-clock num" data-clock></p>
    <p class="control-timer-wrap">
      <button class="control-timer num" type="button" data-timer aria-label="Cronómetro. Toca para pausar o seguir.">0:00</button>
      <button class="control-reset" type="button" data-timer-reset>Reiniciar</button>
    </p>
  </div>
  <main class="control-main" data-main hidden>
    <figure class="control-preview" data-previews hidden>
      <div class="preview-frame">
        <iframe data-preview="next" title="Diapositiva siguiente" tabindex="-1" aria-hidden="true" sandbox="${SANDBOX}"></iframe>
        <p class="preview-end" data-preview-end hidden>Fin</p>
      </div>
      <figcaption data-next-title>Sigue</figcaption>
    </figure>
    <section class="control-notes" data-notes-box hidden aria-label="Notas del presentador" aria-live="polite">
      <p data-notes></p>
    </section>
    <div class="control-buttons">
      <button class="control-next" type="button" data-go="next">Siguiente</button>
      <div class="control-row">
        <button class="control-prev" type="button" data-go="prev">Anterior</button>
        <button class="control-list" type="button" data-open-list hidden>Diapositivas</button>
      </div>
    </div>
  </main>
  <section class="control-state" data-state-box aria-live="polite">
    <h1 data-state-title>Conectando…</h1>
    <p data-state-text></p>
  </section>
  <footer class="control-foot" data-foot hidden>
    <button class="control-end" type="button" data-end>Terminar sesión</button>
  </footer>
  <dialog class="control-jump" data-list aria-labelledby="jump-title">
    <h2 id="jump-title">Ir a una diapositiva</h2>
    <ol class="jump-items" data-list-items></ol>
    <form method="dialog"><button class="control-close" type="submit">Cerrar</button></form>
  </dialog>`,
  });

// ── Moderación (#11) ──────────────────────────────────────────────────────

const MOD_OK: Record<string, string> = {
  "presentacion-desactivar": "Presentación desactivada. Su enlace y su Enlace para presentar ya dan 404.",
  "presentacion-reactivar": "Presentación reactivada. Sus enlaces vuelven a funcionar.",
  "dueno-desactivar": "Cuenta desactivada. Ya no puede entrar, y sus presentaciones y carpetas dan 404.",
  "dueno-reactivar": "Cuenta reactivada. Puede volver a entrar, y lo suyo vuelve a verse.",
};

const MOD_ERROR: Record<string, string> = {
  "no-existe": "Eso ya no existe. Quizás su Dueño lo borró.",
  propia: "No puedes desactivar tu propia cuenta: Sliding se quedaría sin quien lo modere.",
};

const PROVIDER_LABEL: Record<string, string> = { github: "GitHub", google: "Google" };

/** Desactivar (con confirmación) o reactivar. Vuelve a la página con lo que se había buscado. */
const modForm = ({ action, label, search, confirmText }: { action: string; label: string; search: string; confirmText?: string }) =>
  html`<form method="post" action="${action}" ${confirmText ? html`data-confirm="${confirmText}"` : ""}>
    ${search ? html`<input type="hidden" name="enlace" value="${search}" />` : ""}
    <button class="btn btn-small${confirmText ? " btn-danger" : ""}" type="submit">${label}</button>
  </form>`;

const modDeckRow = (deck: ModDeck, search: string) => {
  const visible = !deck.disabled && !deck.ownerDisabled;
  return html`<li class="session${visible ? "" : " is-disabled"}">
  <div class="session-code ${TRACK[deck.kind]}">${deckCount(deck)}</div>
  <div class="session-main">
    ${rowTitle(3, visible ? html`<a href="/d/${deck.id}" target="_blank" rel="noopener">${deck.title}</a>` : deck.title)}
    <p class="session-meta">
      ${KIND_LABEL[deck.kind]} · de ${deck.ownerName ?? "nadie (de prueba)"} · subida el ${day.format(deck.createdAt)} ·
      <span class="num">${formatBytes(deck.size)}</span>
    </p>
    ${deck.disabled
      ? html`<p class="session-warn">Desactivada: da 404 para todos.</p>`
      : deck.ownerDisabled
        ? html`<p class="session-warn">Su Dueño está desactivado: da 404 para todos.</p>`
        : ""}
  </div>
  <div class="session-actions">
    ${deck.disabled
      ? modForm({ action: `/moderacion/presentaciones/${deck.id}/reactivar`, label: "Reactivar", search })
      : modForm({
          action: `/moderacion/presentaciones/${deck.id}/desactivar`,
          label: "Desactivar",
          search,
          confirmText: `¿Desactivar «${deck.title}»? Su enlace y su Enlace para presentar darán 404 hasta que la reactives.`,
        })}
  </div>
</li>`;
};

const modOwnerRow = (owner: ModOwner, me: string, search: string) => html`<li class="session${owner.disabled ? " is-disabled" : ""}">
  <div class="session-code">
    <span class="session-count num">${owner.decks}</span><span class="session-unit">${plural(owner.decks, "presentación", "presentaciones")}</span>
  </div>
  <div class="session-main">
    ${rowTitle(3, owner.name)}
    <p class="session-meta">
      ${PROVIDER_LABEL[owner.provider] ?? owner.provider}${owner.email ? html` · ${owner.email}` : ""} ·
      <span class="num">${formatBytes(owner.bytes)}</span> · entró el ${day.format(owner.lastLoginAt)}
    </p>
    ${owner.disabled ? html`<p class="session-warn">Cuenta desactivada: no puede entrar, y sus presentaciones y carpetas dan 404.</p>` : ""}
  </div>
  <div class="session-actions">
    ${owner.id === me
      ? html`<p class="session-meta">Tu cuenta.</p>`
      : owner.disabled
        ? modForm({ action: `/moderacion/duenos/${owner.id}/reactivar`, label: "Reactivar cuenta", search })
        : modForm({
            action: `/moderacion/duenos/${owner.id}/desactivar`,
            label: "Desactivar cuenta",
            search,
            confirmText: `¿Desactivar la cuenta de ${owner.name}? No podrá entrar, y todas sus presentaciones y carpetas darán 404 hasta que la reactives.`,
          })}
  </div>
</li>`;

/** Lo que encontró «Pegar un enlace»: la presentación o la carpeta, con su Dueño. */
const modFound = (found: Found, me: string, search: string) => {
  if (found.type === "control") {
    return html`<p class="flash flash-error" role="alert">Ese es un enlace del Control: no lleva a ninguna presentación. Pide el enlace de la presentación o el de su carpeta.</p>`;
  }
  if (found.type === "none") {
    return html`<p class="flash flash-error" role="alert">No encontramos ninguna presentación ni carpeta con ese enlace.</p>`;
  }
  const owner = found.owner ? html`<ol class="program" aria-label="Su Dueño">${modOwnerRow(found.owner, me, search)}</ol>` : "";
  return html`<section class="mod-section" aria-labelledby="encontrado">
    <h2 class="program-label" id="encontrado">${found.type === "deck" ? "La presentación" : html`La carpeta «${found.folder.name}»`}</h2>
    ${found.type === "deck"
      ? html`<ol class="program" aria-label="La presentación">${modDeckRow(found.deck, search)}</ol>`
      : html`<p class="mod-note">Una carpeta se apaga con su Dueño: desactivar la cuenta la deja en 404 junto con todo lo demás.</p>`}
    ${owner}
  </section>`;
};

export const moderationPage = ({
  user,
  search,
  found,
  decks,
  owners,
  ok,
  error,
}: {
  user: User;
  search: string;
  found: Found | null;
  decks: ModDeck[];
  owners: ModOwner[];
  ok?: string;
  error?: string;
}) => {
  const okText = ok ? MOD_OK[ok] : undefined;
  const errorText = error ? MOD_ERROR[error] : undefined;
  return layout({
    title: "Moderación · Sliding",
    user,
    page: "panel",
    body: html`<div class="panel-intro mod-intro">
        <h1>Moderación</h1>
        <p class="mod-lead">Lo que desactivas da 404 para todos, y su Dueño lo ve marcado en su panel. Reactivarlo lo devuelve tal cual: nada se borra.</p>
        <form class="new-folder mod-search" method="get" action="/moderacion" role="search">
          <label class="visually-hidden" for="enlace">Enlace de Sliding</label>
          <input class="field" id="enlace" name="enlace" value="${search}" required autocomplete="off"
            placeholder="Pega el enlace de una presentación o carpeta" />
          <button class="btn btn-ink" type="submit">Buscar</button>
        </form>
      </div>
      ${okText ? html`<p class="flash flash-ok" role="status">${okText}</p>` : ""}
      ${errorText ? html`<p class="flash flash-error" role="alert">${errorText}</p>` : ""}
      ${found ? modFound(found, user.id, search) : ""}
      <section class="mod-section" aria-labelledby="recientes">
        <h2 class="program-label" id="recientes">Subidas recientes</h2>
        ${decks.length
          ? html`<ol class="program">${decks.map((deck) => modDeckRow(deck, search))}</ol>`
          : html`<p class="mod-note">Todavía nadie ha subido presentaciones.</p>`}
      </section>
      <section class="mod-section" aria-labelledby="duenos">
        <h2 class="program-label" id="duenos">Dueños</h2>
        <ol class="program">${owners.map((owner) => modOwnerRow(owner, user.id, search))}</ol>
      </section>`,
  });
};

/** Mientras no haya administrador: tu id, para copiarlo en ADMIN_USER_IDS. */
export const moderationSetupPage = (user: User) =>
  layout({
    title: "Moderación · Sliding",
    user,
    page: "read",
    body: html`<header class="read-band track-amarillo">
        <div class="read-band-inner"><h1>Moderación</h1></div>
      </header>
      <article class="read">
        <p class="read-lead">Sliding todavía no tiene administrador.</p>
        <p>El id de tu cuenta es <code class="mod-id">${user.id}</code></p>
        <p>Para que esta cuenta modere Sliding, agrega ese id a <code>ADMIN_USER_IDS</code> en <code>apps/app/wrangler.jsonc</code> y despliega. Desde entonces, esta página existe solo para quien esté en esa lista.</p>
      </article>`,
  });

// ── La skill para tu IA ───────────────────────────────────────────────────

export const skillPage = ({ user }: { user: User | null }) =>
  layout({
    title: "Crea tus presentaciones con IA · Sliding",
    user,
    page: "read",
    index: true,
    body: html`<header class="read-band track-verde">
        <div class="read-band-inner">
          <h1>Crea tus presentaciones con IA</h1>
          <p class="read-date">La skill html-slides, lista para pasársela a tu IA.</p>
        </div>
      </header>
      <article class="read">
        <p class="read-lead">Una skill es un conjunto de instrucciones que le enseña a tu IA a hacer algo bien. Esta le enseña a crear presentaciones HTML de un solo archivo, con ilustraciones animadas y notas para ti en cada diapositiva, listas para subir a Sliding.</p>

        <h2>Cómo usarla</h2>
        <ol>
          <li>Copia el texto de la skill con el botón de abajo.</li>
          <li>Pégaselo a tu IA (Claude, ChatGPT, Gemini…) y pídele: «Crea la skill html-slides con estos archivos y úsala cuando te pida una presentación».</li>
          <li>Pídele una presentación, por ejemplo: «Haz una presentación sobre la fotosíntesis para primer año, con notas para mí en cada diapositiva».</li>
          <li>Sube el archivo .html en <a href="/panel">tu panel</a> y toca «Presentar con control»: tus notas aparecen en el celular.</li>
        </ol>

        <div class="skill-actions">
          <button class="btn btn-ink" type="button" data-copy-skill>Copiar el texto de la skill</button>
          <a class="btn" href="/skill/html-slides.md" download="html-slides.md">Descargar (.md)</a>
        </div>
        <p class="skill-status" data-skill-status role="status"></p>

        <details class="skill-text">
          <summary>Ver el texto completo</summary>
          <pre data-skill-text>Cargando…</pre>
        </details>
      </article>`,
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
          <p class="read-date">Última actualización: 19 de noviembre de 2026.</p>
        </div>
      </header>
      <article class="read">
      <p class="read-lead">Sliding es un sitio para subir presentaciones HTML o PDF y presentarlas con el celular. Esta página dice qué datos guarda, para qué y cómo borrarlos.</p>

      <h2>Qué guardamos</h2>
      <ul>
        <li><strong>Tu cuenta.</strong> Al entrar con GitHub o Google guardamos el identificador de tu cuenta en ese servicio, tu nombre y tu correo. Los usamos para mostrarte tus presentaciones y para avisarte si hay un problema con ellas.</li>
        <li><strong>Tus presentaciones.</strong> Guardamos los archivos HTML o PDF que subes y sus notas del presentador. Cualquiera con el enlace de una presentación puede verla, pero sin las notas.</li>
        <li><strong>Tu .pptx.</strong> Cuando lo eliges junto a un PDF, tu navegador lee las notas y el título de cada diapositiva, y solo ese texto llega a Sliding. El archivo no sale de tu computador.</li>
        <li><strong>Tus carpetas.</strong> Guardamos sus nombres y el orden que les das. Cualquiera con el enlace de una carpeta ve sus presentaciones y las carpetas que tiene dentro, también sin las notas.</li>
        <li><strong>Tus tokens.</strong> Si creas tokens para que un agente suba presentaciones por ti, guardamos solo una huella de cada token, su nombre y la última vez que se usó.</li>
        <li><strong>Las presentaciones en vivo.</strong> Mientras presentas guardamos en qué diapositiva vas. Se borra cuando termina la sesión.</li>
      </ul>

      <h2>Cookies</h2>
      <p>Usamos una sola cookie, para que no tengas que iniciar sesión en cada visita. No usamos cookies de publicidad ni de analítica.</p>

      <h2>Con quién compartimos tus datos</h2>
      <p>Con nadie. Los datos viven en Cloudflare, que aloja el sitio. GitHub y Google solo intervienen cuando inicias sesión con ellos.</p>

      <h2>Moderación</h2>
      <p>Si una presentación se usa para engañar o dañar a otras personas, por ejemplo una página que imita a otro sitio para robar contraseñas, podemos desactivarla o desactivar la cuenta que la subió. Lo desactivado deja de verse para todos, pero no se borra.</p>

      <h2>Cómo borrar tus datos</h2>
      <p>Puedes borrar tus presentaciones desde tu panel cuando quieras. Para borrar tu cuenta y todo lo que contiene, abre una issue en <a href="https://github.com/Aegisystem/Sliding/issues">github.com/Aegisystem/Sliding</a> y la borramos en menos de 30 días.</p>
    </article>`,
  });

// ── Errores y Enlace de la presentación ───────────────────────────────────

export const notFoundPage = (user: User | null = null, what: "presentacion" | "carpeta" = "presentacion") => {
  const folder = what === "carpeta";
  return layout({
    title: `${folder ? "Carpeta no encontrada" : "Presentación no encontrada"} · Sliding`,
    user,
    page: "notice",
    body: html`<section class="band track-naranja">
      <div class="band-inner">
        <h1>${folder ? "Carpeta no encontrada" : "Presentación no encontrada"}</h1>
        <p>${folder
          ? "Esta carpeta no está en el programa. Revisa el enlace; si la carpeta existía, puede que su Dueño la haya borrado."
          : "Esta sesión no está en el programa. Revisa el enlace; si la presentación existía, puede que su Dueño la haya borrado."}</p>
        <p><a class="btn btn-ink" href="/">Ir a la portada</a></p>
      </div>
      <span class="stamp">Cancelada</span>
    </section>`,
  });
};

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
    sandbox="${SANDBOX}"
  ></iframe>
  <script>
    // El teclado mueve la presentación solo si el iframe tiene el foco.
    const frame = document.querySelector("iframe");
    frame.addEventListener("load", () => frame.focus());
  </script>
</body>
</html>`;
