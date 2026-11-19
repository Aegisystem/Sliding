import { TEXTS, type Texts } from "@sliding/core";
import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import type { User } from "./auth/users";
import type { Limits } from "./decks/limits";
import type { DeckRow, PublicDeck, Usage } from "./decks/store";
import { descendantsOf, pathTo, type Folder } from "./folders/store";
import type { Found, ModDeck, ModOwner } from "./moderation/store";

// Todo texto que lee una persona sale de es.ts o en.ts (@sliding/core, #10):
// cada página recibe `t`, los textos del idioma de quien mira.

type Html = HtmlEscapedString | Promise<HtmlEscapedString>;

const FONT = "/fonts/archivo-latin-wdth.woff2";

// ── Piezas comunes ────────────────────────────────────────────────────────

/** Cifras y fechas en el idioma de la página. */
const formats = new Map<string, { number: Intl.NumberFormat; day: Intl.DateTimeFormat }>();
function fmt(t: Texts) {
  let f = formats.get(t.locale);
  if (!f) {
    f = {
      number: new Intl.NumberFormat(t.locale, { maximumFractionDigits: 1 }),
      day: new Intl.DateTimeFormat(t.locale, { day: "numeric", month: "short", timeZone: "UTC" }),
    };
    formats.set(t.locale, f);
  }
  return f;
}

export function formatBytes(bytes: number, t: Texts = TEXTS.es): string {
  const { number } = fmt(t);
  if (bytes === 0) return "0 MB";
  if (bytes < 1024 * 1024) return `${number.format(Math.max(1, Math.round(bytes / 1024)))} KB`;
  return `${number.format(bytes / (1024 * 1024))} MB`;
}
const mb = (bytes: number, t: Texts) => fmt(t).number.format(bytes / (1024 * 1024));
const day = (time: number, t: Texts) => fmt(t).day.format(time);

const escapeText = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Un texto de es.ts o en.ts con su markdown mínimo: **negrita**, `código` y [enlace](/ruta). */
const rich = (text: string) =>
  raw(
    escapeText(text)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`(.+?)`/g, "<code>$1</code>")
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>'),
  );

/** Una cifra tabular dentro de un texto armado con raw: solo números o tamaños, nunca texto del Dueño. */
const num = (value: string | number) => `<span class="num">${escapeText(String(value))}</span>`;

/** Las páginas de presentaciones no se indexan: su enlace no está listado. */
const head = (title: string, { index = false, styled = true } = {}) => html`<meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${index ? "" : html`<meta name="robots" content="noindex" />`}
  <title>${title}</title>
  ${styled
    ? html`<link rel="preload" href="${FONT}" as="font" type="font/woff2" crossorigin />
        <link rel="stylesheet" href="/styles.css" />`
    : ""}`;

/** Los textos de los scripts del navegador, como JSON que no puede cerrar el <script>. */
const clientTexts = (t: Texts) =>
  html`<script type="application/json" id="textos">${raw(JSON.stringify(t.client).replace(/</g, "\\u003c"))}</script>`;

/**
 * El selector de idioma: lleva al otro idioma y lo recuerda en una cookie.
 * app.js pone en `volver` la página actual; sin JS, el servidor usa el Referer.
 */
const languageSwitch = (t: Texts) => {
  const other = TEXTS[t.lang === "es" ? "en" : "es"];
  return html`<form class="lang-switch" method="post" action="/idioma">
    <input type="hidden" name="volver" value="" data-back />
    <button type="submit" name="idioma" value="${other.lang}" lang="${other.lang}" aria-label="${other.switchLabel}">
      <span class="lang-name">${other.name}</span><span class="lang-code" aria-hidden="true">${other.lang.toUpperCase()}</span>
    </button>
  </form>`;
};

/** Cabecera corrida, como la de cada página de un programa impreso. */
const runningHead = (t: Texts, user: User | null) => html`<header class="running-head">
  <a class="wordmark" href="/">Sliding</a>
  <nav class="running-nav" aria-label="${t.common.mainNav}">
    ${user
      ? html`<a href="/panel">${t.common.panel}</a>
          <span class="running-user">
            ${user.avatarUrl ? html`<img src="${user.avatarUrl}" alt="" width="24" height="24" referrerpolicy="no-referrer" />` : ""}
            <span>${user.name}</span>
          </span>
          <form method="post" action="/auth/logout"><button type="submit">${t.common.logout}</button></form>`
      : html`<a href="/#entrar">${t.common.login}</a>`}
    ${languageSwitch(t)}
  </nav>
</header>`;

const footer = (t: Texts) => html`<footer class="colophon">
  <p>${t.common.tagline}</p>
  <p><a href="/skill">${t.common.skill}</a> · <a href="/privacidad">${t.common.privacy}</a> · <a href="https://github.com/Aegisystem/Sliding">${t.common.code}</a></p>
</footer>`;

const layout = ({
  t,
  title,
  user,
  body,
  page,
  index = false,
}: {
  t: Texts;
  title: string;
  user: User | null;
  body: Html;
  page: string;
  index?: boolean;
}) => html`<!doctype html>
<html lang="${t.lang}">
<head>
  ${head(title, { index })}
</head>
<body class="page-${page}">
  <a class="skip" href="#contenido">${t.common.skip}</a>
  ${runningHead(t, user)}
  <main id="contenido">${body}</main>
  ${footer(t)}
  ${clientTexts(t)}
  <script src="/app.js" defer></script>
</body>
</html>`;

/** «Biología · Sliding». */
const titled = (t: Texts, ...parts: string[]) => [...parts, t.common.suffix].join(" · ");

const githubMark = html`<svg class="mark" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>`;

const googleMark = html`<svg class="mark" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;

// ── Portada ───────────────────────────────────────────────────────────────

/** La credencial colgada de su cinta: el control para entrar y, ya dentro, tu identidad. */
const hangingBadge = (t: Texts, inner: Html, { id, variant }: { id?: string; variant: "cover" | "panel" }) => html`<div
  class="badge-hang badge-hang-${variant}"
  ${id ? html`id="${id}"` : ""}
>
  <span class="lanyard" aria-hidden="true"></span>
  <section class="badge" aria-labelledby="badge-name">
    <span class="badge-slot" aria-hidden="true"></span>
    ${inner}
    <p class="badge-role">${t.common.presenter}</p>
  </section>
</div>`;

const badgePhoto = (user: User) =>
  user.avatarUrl
    ? html`<img class="badge-photo" src="${user.avatarUrl}" alt="" width="64" height="64" referrerpolicy="no-referrer" />`
    : "";

const coverBadge = (t: Texts, user: User | null, error?: string) =>
  hangingBadge(
    t,
    user
      ? html`${badgePhoto(user)}
          <h2 class="badge-name" id="badge-name">${t.login.helloName(user.name)}</h2>
          <div class="badge-actions">
            <a class="btn btn-ink" href="/panel">${t.login.goPanel}</a>
            <form method="post" action="/auth/logout"><button class="btn" type="submit">${t.common.logout}</button></form>
          </div>`
      : html`<h2 class="badge-name" id="badge-name">${t.login.hello}</h2>
          <p class="badge-note">${t.login.note}</p>
          ${error && t.login.errors[error] ? html`<p class="badge-error" role="alert">${t.login.errors[error]}</p>` : ""}
          <div class="badge-actions">
            <a class="btn btn-ink" href="/auth/github">${githubMark}<span>${t.login.github}</span></a>
            <a class="btn" href="/auth/google">${googleMark}<span>${t.login.google}</span></a>
          </div>`,
    { id: "entrar", variant: "cover" },
  );

export const homePage = ({ t, user, error, limits }: { t: Texts; user: User | null; error?: string; limits: Limits }) => {
  const h = t.home;
  return layout({
    t,
    title: "Sliding",
    user,
    page: "home",
    index: true,
    body: html`<div class="cover">
        <div class="cover-top">
          <h1 class="cover-title">Sliding</h1>
          <p class="cover-lead">${h.lead}</p>
        </div>
        <div class="cover-tracks">
        ${coverBadge(t, user, error)}
        <ol class="tracks" aria-label="${h.tracksLabel}">
          <li class="track track-azul">
            <h2>${h.before}</h2>
            <p>${h.beforeText(mb(limits.deckBytes, t))}</p>
          </li>
          <li class="track track-naranja">
            <h2>${h.start}</h2>
            <p>${h.startText}</p>
          </li>
          <li class="track track-verde">
            <h2>${h.during}</h2>
            <p>${h.duringText}</p>
          </li>
          <li class="track track-amarillo">
            <h2>${h.after}</h2>
            <p>${h.afterText}</p>
          </li>
        </ol>
        </div>
      </div>
      <section class="info" aria-labelledby="info-title">
        <h2 id="info-title">${h.infoTitle}</h2>
        <dl class="info-rows">
          <div>
            <dt>${h.formats}</dt>
            <dd>${h.formatsText}</dd>
          </div>
          <div>
            <dt>${h.help}</dt>
            <dd>${rich(h.helpText)}</dd>
          </div>
          <div>
            <dt>${h.folders}</dt>
            <dd>${h.foldersText}</dd>
          </div>
          <div>
            <dt>${h.space}</dt>
            <dd>${h.spaceText(mb(limits.bytesPerOwner, t), mb(limits.deckBytes, t))}</dd>
          </div>
          <div>
            <dt>${h.privacy}</dt>
            <dd>${h.privacyText}</dd>
          </div>
          <div>
            <dt>${h.agents}</dt>
            <dd>${h.agentsText}</dd>
          </div>
          <div>
            <dt>${h.price}</dt>
            <dd>${h.priceText}</dd>
          </div>
        </dl>
      </section>`,
  });
};

// ── Panel ─────────────────────────────────────────────────────────────────

const panelError = (t: Texts, code: string, usage: Usage, limits: Limits): string | null => {
  if (code === "muy-grande") return t.panel.tooBig(mb(limits.deckBytes, t));
  if (code === "cupo-espacio") return t.panel.noSpace(formatBytes(usage.bytes, t), mb(limits.bytesPerOwner, t));
  return t.panel.errors[code] ?? null;
};

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

const chevron = html`<svg viewBox="0 0 10 16" width="10" height="16" aria-hidden="true" focusable="false"><path d="M2.5 2.5l5 5.5-5 5.5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/**
 * El árbol de carpetas, a la izquierda del panel: «Tus presentaciones» y
 * todas las carpetas del Dueño. Se ve abierta la ruta hasta la carpeta
 * abierta; las demás se abren con su flecha (solo con JS). Cada carpeta
 * recibe lo que se arrastra (drag.js).
 */
const folderTreeNav = (t: Texts, folders: Folder[], currentId: string | null) => {
  const open = new Set(pathTo(folders, currentId).map((f) => f.id));
  const seen = new Set<string>();
  const kids = (parentId: string | null) => folders.filter((f) => f.parentId === parentId && !seen.has(f.id));
  const branch = (children: Folder[], expanded: boolean): Html => html`<ul class="tree-list" ${expanded ? "" : "hidden"}>
    ${children.map((f) => {
      seen.add(f.id);
      const inner = kids(f.id);
      const isOpen = open.has(f.id);
      return html`<li data-folder="${f.id}">
        <div class="tree-row">
          ${inner.length
            ? html`<button class="tree-toggle" type="button" aria-expanded="${String(isOpen)}" aria-label="${t.panel.treeToggle(f.name)}" data-needs-js hidden>${chevron}</button>`
            : html`<span class="tree-toggle" aria-hidden="true"></span>`}
          <a class="tree-link" href="/panel/f/${f.id}" data-drop="${f.id}" ${f.id === currentId ? html`aria-current="page"` : ""}>${f.name}</a>
        </div>
        ${inner.length ? branch(inner, isOpen) : ""}
      </li>`;
    })}
  </ul>`;
  return html`<aside class="panel-side">
    <button class="btn btn-small tree-open" type="button" aria-expanded="false" aria-controls="arbol" data-tree-open hidden>
      ${t.panel.tree} ${chevron}
    </button>
    <nav class="tree" id="arbol" aria-labelledby="arbol-titulo">
      <h2 class="tree-title" id="arbol-titulo">${t.panel.tree}</h2>
      <ul class="tree-list tree-root">
        <li data-folder="raiz">
          <div class="tree-row">
            <a class="tree-link" href="/panel" data-drop="raiz" ${currentId ? "" : html`aria-current="page"`}>${t.panel.root}</a>
          </div>
          ${branch(kids(null), true)}
        </li>
      </ul>
    </nav>
  </aside>`;
};

/** El formulario vuelve a la carpeta que se está viendo. */
const backField = (name: string, folderId: string | null) =>
  folderId ? html`<input type="hidden" name="${name}" value="${folderId}" />` : "";

/**
 * «Mover a», dentro del menú «Más»: elegir la carpeta ya mueve (sin JS, con su
 * botón). Es el camino para quien no arrastra: el teclado o un lector de pantalla.
 */
const moveForm = ({
  t,
  id,
  action,
  title,
  options,
  folderId,
}: {
  t: Texts;
  id: string;
  action: string;
  title: string;
  options: { value: string; label: string; here: boolean }[];
  folderId: string | null;
}) =>
  options.some((o) => !o.here)
    ? html`<form class="move" method="post" action="${action}">
        ${backField("volver", folderId)}
        <label class="more-label" for="mover-${id}">${t.panel.move}<span class="visually-hidden"> «${title}»</span> ${t.panel.moveTo}</label>
        <select class="select" id="mover-${id}" name="destino" required>
          <option value="" selected disabled>${t.panel.moveChoose}</option>
          ${options.map(
            (o) => html`<option value="${o.value}" ${o.here ? "disabled" : ""}>${o.label}${o.here ? t.panel.here : ""}</option>`,
          )}
        </select>
        <noscript><button class="btn btn-small" type="submit">${t.panel.moveSubmit}</button></noscript>
      </form>`
    : "";

/**
 * Subir y Bajar, arriba y abajo del código de la hilera. Con el mouse también
 * se puede arrastrar el código. Solo con JS y con dos hileras o más.
 */
const orderButton = (t: Texts, dir: "up" | "down", name: string) => html`<button class="order order-${dir}" type="button" data-move="${dir}" hidden aria-describedby="orden-ayuda" aria-label="${dir === "up" ? t.panel.up(name) : t.panel.down(name)}">
  <svg viewBox="0 0 16 10" width="16" height="10" aria-hidden="true" focusable="false"><path d="${dir === "up" ? "M2 8.5l6-6 6 6" : "M2 1.5l6 6 6-6"}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
</button>`;

/** La señal de que la hilera se arrastra: seis puntos a la derecha. En el celular, tomarla de ahí la levanta al instante. El teclado usa Subir, Bajar y «Mover a». */
const dragHint = (t: Texts) => html`<span class="drag-hint" title="${t.panel.dragHint}" aria-hidden="true">
  <svg viewBox="0 0 12 20" width="12" height="20" focusable="false"><circle cx="3" cy="4" r="1.75"/><circle cx="9" cy="4" r="1.75"/><circle cx="3" cy="10" r="1.75"/><circle cx="9" cy="10" r="1.75"/><circle cx="3" cy="16" r="1.75"/><circle cx="9" cy="16" r="1.75"/></svg>
</span>`;

/**
 * «Más»: lo que se hace de vez en cuando con una hilera (reemplazar, notas,
 * mover, borrar) va en un menú, para que la hilera muestre solo lo de siempre.
 * Es un <details>: se abre sin JS; app.js lo cierra al hacer clic fuera o con Esc.
 */
const moreMenu = (t: Texts, title: string, items: Html) => html`<details class="more">
  <summary class="btn btn-small">${t.panel.more}<span class="visually-hidden">${t.panel.moreAbout(title)}</span>${chevron}</summary>
  <div class="more-menu">${items}</div>
</details>`;

/** Un título de hilera: h3 bajo los rótulos «Carpetas» y «Presentaciones», h2 si no hay rótulos. */
const rowTitle = (level: 2 | 3, inner: Html | string) =>
  level === 3 ? html`<h3 class="session-title">${inner}</h3>` : html`<h2 class="session-title">${inner}</h2>`;

interface PanelContext {
  t: Texts;
  origin: string;
  folderId: string | null;
  tree: { folder: Folder; label: string }[];
  folders: Folder[];
  level: 2 | 3;
}

/** El color de cada tipo de presentación en su cuadro de código. */
const TRACK: Record<DeckRow["kind"], string> = { "html-slides": "track-azul", pdf: "track-naranja", generic: "track-amarillo" };

/** Lo que va en el cuadro de código: cuántas diapositivas tiene o, si no se sabe, su formato. */
const deckCount = (t: Texts, deck: Pick<DeckRow, "kind" | "slideCount">) =>
  deck.kind === "html-slides" || (deck.kind === "pdf" && deck.slideCount)
    ? html`<span class="session-count num">${deck.slideCount ?? 0}</span><span class="session-unit">${t.units.slides(deck.slideCount ?? 0)}</span>`
    : deck.kind === "pdf"
      ? html`<span class="session-count session-count-word">${t.panel.pdfWord}</span><span class="session-unit">${t.panel.pdfUnit}</span>`
      : html`<span class="session-count session-count-word">${t.panel.htmlWord}</span><span class="session-unit">${t.panel.htmlUnit}</span>`;

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
const notesForm = (deck: DeckRow, { t, folderId }: PanelContext) => html`<form class="add-notes" method="post" action="/panel/decks/${deck.id}/notas" enctype="multipart/form-data" data-needs-js hidden>
  ${backField("volver", folderId)}
  <input type="hidden" name="notas" />
  <label class="btn btn-small">
    ${deck.notesCount === null ? t.panel.addNotes : t.panel.changeNotes}
    <input class="visually-hidden" type="file" accept="${pptxAccept}" data-pptx aria-describedby="pptx-${deck.id}" />
  </label>
  <span class="visually-hidden" id="pptx-${deck.id}">${t.panel.notesHint}</span>
</form>`;

const deckRow = (deck: DeckRow, ctx: PanelContext) => {
  const { t } = ctx;
  return html`<li class="session${deck.disabled ? " is-disabled" : ""}" data-id="${deck.id}">
  <div class="session-code ${TRACK[deck.kind]}">
    ${orderButton(t, "up", deck.title)}
    ${deckCount(t, deck)}
    ${orderButton(t, "down", deck.title)}
  </div>
  <div class="session-main">
    ${dragHint(t)}
    ${rowTitle(ctx.level, deck.title)}
    <p class="session-meta">
      ${t.panel.kinds[deck.kind]} ·
      ${deck.kind === "pdf" ? html`${deck.notesCount === null ? t.panel.withoutNotes : t.panel.withNotes} · ` : ""}
      <span class="num">${formatBytes(deck.size, t)}</span> · ${t.panel.updated(day(deck.updatedAt, t))}
    </p>
    ${notesMismatch(deck)
      ? html`<p class="session-warn">${raw(t.panel.notesMismatch(num(deck.notesCount ?? 0), escapeText(t.units.visibleSlides(deck.notesCount ?? 0)), num(deck.slideCount ?? 0)))}</p>`
      : ""}
  </div>
  <div class="session-go">
    ${deck.disabled
      ? // La desactivó el administrador (#11): sus enlaces dan 404, así que no se ofrecen.
        html`<p class="session-off"><strong>${t.panel.disabledStrong}</strong> ${t.panel.disabledText}</p>`
      : html`<a class="btn btn-ink" href="/p/${deck.presentSecret}" target="_blank" rel="noopener">${t.panel.present}</a>
          <a class="btn" href="/d/${deck.id}" target="_blank" rel="noopener">${t.panel.view}</a>
          <button class="btn btn-small copy" type="button" data-copy="${ctx.origin}/d/${deck.id}">${t.panel.copyLink}</button>`}
  </div>
  <div class="session-actions">
    ${moreMenu(
      t,
      deck.title,
      html`${deck.disabled
      ? ""
      : html`<form class="replace" method="post" action="/panel/decks/${deck.id}" enctype="multipart/form-data" data-deck-form>
          ${backField("volver", ctx.folderId)}
          <input type="hidden" name="notas" />
          <label class="btn btn-small">
            ${t.panel.replace}
            <input class="visually-hidden" type="file" name="file" accept="${deckAccept}" multiple required />
          </label>
          <noscript><button class="btn btn-small" type="submit">${t.panel.replaceSubmit}</button></noscript>
        </form>
        ${deck.kind === "pdf" ? notesForm(deck, ctx) : ""}`}
    ${moveForm({
      t,
      id: deck.id,
      action: `/panel/decks/${deck.id}/mover`,
      title: deck.title,
      folderId: ctx.folderId,
      options: [
        { value: "raiz", label: t.panel.noFolder, here: ctx.folderId === null },
        ...ctx.tree.map(({ folder, label }) => ({ value: folder.id, label, here: folder.id === ctx.folderId })),
      ],
    })}
    <form class="delete" method="post" action="/panel/decks/${deck.id}/delete" data-confirm="${t.panel.deleteDeck(deck.title)}">
      ${backField("volver", ctx.folderId)}
      <button class="btn btn-small btn-danger" type="submit">${t.panel.delete}</button>
    </form>`,
    )}
  </div>
</li>`;
};

/** «Carpeta · 2 carpetas dentro», con la cifra tabular. */
const folderMeta = (t: Texts, folders: number) =>
  html`${t.panel.folderWord}${folders ? raw(t.panel.foldersInside(num(folders), escapeText(t.units.folders(folders)))) : ""}`;

const folderRow = (folder: FolderRow, ctx: PanelContext) => {
  const { t } = ctx;
  const inside = descendantsOf(ctx.folders, folder.id);
  return html`<li class="session session-folder" data-id="${folder.id}" data-decks="${folder.decks}" data-folders="${folder.folders}">
  <div class="session-code track-verde">
    ${orderButton(t, "up", folder.name)}
    <span class="session-count num">${folder.decks}</span><span class="session-unit">${t.units.decks(folder.decks)}</span>
    ${orderButton(t, "down", folder.name)}
  </div>
  <div class="session-main">
    ${dragHint(t)}
    ${rowTitle(ctx.level, html`<a href="/panel/f/${folder.id}">${folder.name}</a>`)}
    <p class="session-meta">
      ${folderMeta(t, folder.folders)}
    </p>
  </div>
  <div class="session-go">
    <a class="btn btn-ink" href="/panel/f/${folder.id}">${t.panel.openFolder}</a>
    <button class="btn btn-small copy" type="button" data-copy="${ctx.origin}/f/${folder.id}">${t.panel.copyLink}</button>
  </div>
  <div class="session-actions">
    ${moreMenu(
      t,
      folder.name,
      html`${moveForm({
      t,
      id: folder.id,
      action: `/panel/carpetas/${folder.id}/mover`,
      title: folder.name,
      folderId: ctx.folderId,
      options: [
        { value: "raiz", label: t.panel.noFolder, here: ctx.folderId === null },
        ...ctx.tree
          .filter(({ folder: f }) => !inside.has(f.id))
          .map(({ folder: f, label }) => ({ value: f.id, label, here: f.id === ctx.folderId })),
      ],
    })}
    <form class="delete" method="post" action="/panel/carpetas/${folder.id}/borrar" data-confirm="${t.panel.deleteFolderHere(folder.name)}">
      <button class="btn btn-small btn-danger" type="submit">${t.panel.delete}</button>
    </form>`,
    )}
  </div>
</li>`;
};

/** Lo que se hace con la carpeta abierta: compartirla, verla como los demás, renombrarla y borrarla. */
const folderTools = (t: Texts, folder: Folder, parentName: string, origin: string) => html`<div class="folder-tools">
  <button class="btn btn-small copy" type="button" data-copy="${origin}/f/${folder.id}">${t.panel.copyFolderLink}</button>
  <a class="btn btn-small" href="/f/${folder.id}" target="_blank" rel="noopener">${t.panel.viewAsOthers}</a>
  <button class="btn btn-small" type="button" data-rename-toggle aria-expanded="false" aria-controls="renombrar" hidden>${t.panel.rename}</button>
  <form class="delete" method="post" action="/panel/carpetas/${folder.id}/borrar" data-confirm="${t.panel.deleteFolderInto(folder.name, parentName)}">
    <button class="btn btn-small btn-danger" type="submit">${t.panel.deleteFolder}</button>
  </form>
</div>
<form class="rename" id="renombrar" method="post" action="/panel/carpetas/${folder.id}/nombre">
  <label for="nombre-carpeta">${t.panel.folderName}</label>
  <input class="field" id="nombre-carpeta" name="nombre" value="${folder.name}" maxlength="80" required autocomplete="off" />
  <button class="btn btn-small btn-ink" type="submit">${t.panel.saveName}</button>
</form>`;

export const panelPage = ({
  t,
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
  t: Texts;
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
  const p = t.panel;
  const okText = ok ? p.ok[ok] : undefined;
  const errorText = error ? panelError(t, error, usage, limits) : null;
  const folderId = folder?.id ?? null;
  const labelled = children.length > 0 && decks.length > 0;
  const ctx: PanelContext = { t, origin, folderId, tree: folderTree(folders), folders, level: labelled ? 3 : 2 };
  const ancestors = path.slice(0, -1);
  const parentName = ancestors.at(-1)?.name ?? p.root;
  const title = folder ? folder.name : p.root;

  return layout({
    t,
    title: folder ? titled(t, folder.name, p.title) : titled(t, p.title),
    user,
    page: "panel",
    body: html`<div class="panel-head">
        <div class="panel-intro">
          ${folder
            ? html`<nav class="crumbs" aria-label="${p.crumbs}">
                <ol>
                  <li><a href="/panel" data-drop="raiz">${p.root}</a></li>
                  ${ancestors.map((f) => html`<li><a href="/panel/f/${f.id}" data-drop="${f.id}">${f.name}</a></li>`)}
                </ol>
              </nav>`
            : ""}
          <h1>${title}</h1>
          ${folder ? folderTools(t, folder, parentName, origin) : ""}
          <div class="panel-tools">
            <form class="upload" method="post" action="/panel/decks" enctype="multipart/form-data" data-deck-form>
              ${backField("carpeta", folderId)}
              <input type="hidden" name="notas" />
              <label class="btn btn-ink">
                ${p.upload}
                <input class="visually-hidden" type="file" name="file" accept="${deckAccept}" multiple required aria-describedby="subir-ayuda" />
              </label>
              <button class="btn" type="button" data-new-folder aria-expanded="false" aria-controls="carpeta-nueva" hidden>${p.newFolder}</button>
              <span class="upload-file" aria-live="polite">${p.uploadNote(mb(limits.deckBytes, t))}</span>
              <p class="upload-help" id="subir-ayuda">${p.uploadHelp}</p>
              <noscript><button class="btn" type="submit">${p.uploadSubmit}</button></noscript>
            </form>
            <form class="new-folder" id="carpeta-nueva" method="post" action="/panel/carpetas" ${error === "nombre" ? html`data-open` : ""}>
              ${backField("carpeta", folderId)}
              <label for="nueva-carpeta">${folder ? p.newFolderInside(folder.name) : p.newFolderLabel}</label>
              <div class="new-folder-row">
                <input class="field" id="nueva-carpeta" name="nombre" maxlength="80" required autocomplete="off"
                  placeholder="${folder ? p.newFolderExample : p.newFolderExampleRoot}" />
                <button class="btn btn-ink" type="submit">${p.createFolder}</button>
                <button class="btn" type="button" data-new-folder-cancel hidden>${p.cancel}</button>
              </div>
            </form>
          </div>
        </div>
        ${hangingBadge(
          t,
          html`${badgePhoto(user)}
            <h2 class="badge-name" id="badge-name">${user.name}</h2>
            <p class="badge-quota">
              <span class="num">${usage.decks}</span> ${t.units.decks(usage.decks)}<br />
              ${raw(p.quota(num(formatBytes(usage.bytes, t)), num(mb(limits.bytesPerOwner, t))))}
            </p>`,
          { variant: "panel" },
        )}
      </div>
      <div class="panel-alerts">
        <p class="flash flash-error" data-order-error role="alert" hidden>${p.orderError}</p>
        <p class="flash flash-error" data-move-error role="alert" hidden></p>
        <p class="flash flash-error" data-file-error role="alert" hidden></p>
        ${okText ? html`<p class="flash flash-ok" role="status">${okText}</p>` : ""}
        ${errorText ? html`<p class="flash flash-error" role="alert">${errorText}</p>` : ""}
      </div>
      ${folders.length ? folderTreeNav(t, folders, folderId) : ""}
      <div class="panel-lists">
        ${children.length
          ? html`${labelled ? html`<h2 class="program-label">${p.folders}</h2>` : ""}
              <ol class="program" aria-label="${p.folders}" data-sortable="folders" data-parent="${folderId ?? ""}">
                ${children.map((f) => folderRow(f, ctx))}
              </ol>`
          : ""}
        ${decks.length
          ? html`${labelled ? html`<h2 class="program-label">${p.decks}</h2>` : ""}
              <ol class="program" aria-label="${p.decks}" data-sortable="decks" data-parent="${folderId ?? ""}">
                ${decks.map((deck) => deckRow(deck, ctx))}
              </ol>`
          : ""}
        ${folder
            ? html`<div class="empty" data-empty ${children.length || decks.length ? "hidden" : ""}>
                <h2>${p.emptyFolder}</h2>
                <p>${p.emptyFolderText}</p>
              </div>`
            : html`<div class="empty" data-empty ${children.length || decks.length ? "hidden" : ""}>
                <h2>${p.emptyRoot}</h2>
                <p>${rich(p.emptyRootText)}</p>
              </div>`}
      </div>
      <p class="visually-hidden" id="orden-ayuda">${p.orderHelp}</p>
      <p class="visually-hidden" data-order-status role="status"></p>`,
  });
};

// ── Enlace de la carpeta ──────────────────────────────────────────────────

/** Lo que ve quien tiene el Enlace de la carpeta: sus carpetas y presentaciones, sin notas ni opción de presentar. */
export const folderPage = ({
  t,
  user,
  folder,
  path,
  root,
  children,
  decks,
}: {
  t: Texts;
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
    t,
    title: titled(t, folder.name),
    user,
    page: "folder",
    body: html`<header class="folder-band track-verde">
        <div class="folder-band-inner">
          ${path.length > 1
            ? html`<nav class="crumbs" aria-label="${t.folder.crumbs}">
                <ol>
                  ${path.slice(0, -1).map((f) => html`<li><a href="${via(f.id)}">${f.name}</a></li>`)}
                </ol>
              </nav>`
            : ""}
          <h1>${folder.name}</h1>
          <p class="folder-sub">
            <span class="num">${decks.length}</span> ${t.units.decks(decks.length)}${children.length
              ? html` · <span class="num">${children.length}</span> ${t.units.folders(children.length)}`
              : ""}
          </p>
        </div>
      </header>
      <div class="folder-body">
        ${children.length
          ? html`${level === 3 ? html`<h2 class="program-label">${t.panel.folders}</h2>` : ""}
              <ol class="program" aria-label="${t.panel.folders}">
                ${children.map(
                  (f) => html`<li class="session session-public">
                    <div class="session-code track-verde">
                      <span class="session-count num">${f.decks}</span><span class="session-unit">${t.units.decks(f.decks)}</span>
                    </div>
                    <div class="session-main">
                      ${rowTitle(level, html`<a href="${via(f.id)}">${f.name}</a>`)}
                      <p class="session-meta">
                        ${folderMeta(t, f.folders)}
                      </p>
                    </div>
                    <div class="session-go"><a class="btn" href="${via(f.id)}">${t.panel.openFolder}</a></div>
                  </li>`,
                )}
              </ol>`
          : ""}
        ${decks.length
          ? html`${level === 3 ? html`<h2 class="program-label">${t.panel.decks}</h2>` : ""}
              <ol class="program" aria-label="${t.panel.decks}">
                ${decks.map(
                  (deck) => html`<li class="session session-public">
                    <div class="session-code ${TRACK[deck.kind]}">${deckCount(t, deck)}</div>
                    <div class="session-main">
                      ${rowTitle(level, html`<a href="/d/${deck.id}">${deck.title}</a>`)}
                      <p class="session-meta">${t.folder.updated(day(deck.updatedAt, t))}</p>
                    </div>
                    <div class="session-go"><a class="btn btn-ink" href="/d/${deck.id}">${t.folder.viewDeck}</a></div>
                  </li>`,
                )}
              </ol>`
          : ""}
        ${children.length || decks.length
          ? ""
          : html`<div class="empty"><h2>${t.folder.empty}</h2><p>${t.folder.emptyText}</p></div>`}
      </div>`,
  });
};

// ── Sesión en vivo: Pantalla y Control ────────────────────────────────────

const SANDBOX = "allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-downloads";

/** Página sin cabecera ni pie: la Pantalla y el Control ocupan toda la ventana. */
const bareLayout = ({ t, title, page, attrs, body, script }: { t: Texts; title: string; page: string; attrs: Html; body: Html; script: string }) =>
  html`<!doctype html>
<html lang="${t.lang}">
<head>
  ${head(title)}
  <meta name="theme-color" content="#111318" />
</head>
<body class="page-${page}" ${attrs}>
  ${body}
  ${clientTexts(t)}
  <script src="${script}" defer></script>
</body>
</html>`;

/**
 * La Pantalla (Enlace para presentar): la presentación a pantalla completa y,
 * encima, la preparación con el QR de control hasta que un celular lo escanea.
 */
export const screenPage = ({
  t,
  title,
  secret,
  deckSrc,
  decksOrigin,
}: {
  t: Texts;
  title: string;
  secret: string;
  deckSrc: string;
  decksOrigin: string;
}) => {
  const s = t.screen;
  return bareLayout({
    t,
    title: titled(t, s.title(title)),
    page: "screen",
    attrs: html`data-secret="${secret}" data-decks-origin="${decksOrigin}"`,
    script: "/pantalla.js",
    body: html`<iframe class="screen-deck" src="${deckSrc}" title="${title}" allow="fullscreen" sandbox="${SANDBOX}"></iframe>
  <section class="prep" data-state="connecting" aria-labelledby="prep-title">
    <div class="prep-info">
      <h1 id="prep-title">${title}</h1>
      <ol class="prep-steps">
        <li>${s.step1}</li>
        <li>${s.step2}</li>
        <li>${s.step3}</li>
      </ol>
      <p class="prep-actions">
        <button class="btn" type="button" data-fullscreen>${s.fullscreen}</button>
        <span class="prep-hint">${s.newQrHint}</span>
      </p>
      <div class="prep-message" data-message hidden>
        <p class="prep-message-text" data-message-text></p>
        <button class="btn" type="button" data-restart hidden>${s.restart}</button>
      </div>
      <div class="prep-phone">
        <p class="prep-phone-text">${s.phoneText}</p>
        <div class="prep-phone-actions">
          <button class="btn" type="button" data-share>${s.share}</button>
          <button class="btn btn-ghost" type="button" data-here>${s.here}</button>
        </div>
      </div>
    </div>
    <figure class="prep-qr">
      <div class="qr" data-qr role="img" aria-label="${s.qrLabel}">${s.qrLoading}</div>
      <figcaption>${s.qrCaption}</figcaption>
    </figure>
  </section>
  <p class="screen-toast" data-toast role="status" aria-live="polite"></p>`,
  });
};

/** El Control: lo que ve el Presentador en su celular. Oscuro: se usa con la luz baja. */
export const controlPage = ({ t, sessionId, decksOrigin }: { t: Texts; sessionId: string; decksOrigin: string }) => {
  const k = t.control;
  return bareLayout({
    t,
    title: titled(t, k.title),
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
      <button class="control-timer num" type="button" data-timer aria-label="${k.timer}">0:00</button>
      <button class="control-reset" type="button" data-timer-reset>${k.reset}</button>
    </p>
  </div>
  <main class="control-main" data-main hidden>
    <figure class="control-preview" data-previews hidden>
      <div class="preview-frame">
        <iframe data-preview="next" title="${k.nextSlide}" tabindex="-1" aria-hidden="true" sandbox="${SANDBOX}"></iframe>
        <p class="preview-end" data-preview-end hidden>${k.end}</p>
      </div>
      <figcaption data-next-title>${k.upNext}</figcaption>
    </figure>
    <section class="control-notes" data-notes-box hidden aria-label="${k.notes}" aria-live="polite">
      <p data-notes></p>
    </section>
    <div class="control-buttons">
      <button class="control-next" type="button" data-go="next">${k.next}</button>
      <div class="control-row">
        <button class="control-prev" type="button" data-go="prev">${k.prev}</button>
        <button class="control-list" type="button" data-open-list hidden>${k.list}</button>
      </div>
    </div>
  </main>
  <section class="control-state" data-state-box aria-live="polite">
    <h1 data-state-title>${k.connecting}</h1>
    <p data-state-text></p>
  </section>
  <footer class="control-foot" data-foot hidden>
    <button class="control-end" type="button" data-end>${k.finish}</button>
  </footer>
  <dialog class="control-jump" data-list aria-labelledby="jump-title">
    <h2 id="jump-title">${k.jump}</h2>
    <ol class="jump-items" data-list-items></ol>
    <form method="dialog"><button class="control-close" type="submit">${k.close}</button></form>
  </dialog>`,
  });
};

// ── Moderación (#11) ──────────────────────────────────────────────────────

const PROVIDER_LABEL: Record<string, string> = { github: "GitHub", google: "Google" };

/** Desactivar (con confirmación) o reactivar. Vuelve a la página con lo que se había buscado. */
const modForm = ({ action, label, search, confirmText }: { action: string; label: string; search: string; confirmText?: string }) =>
  html`<form method="post" action="${action}" ${confirmText ? html`data-confirm="${confirmText}"` : ""}>
    ${search ? html`<input type="hidden" name="enlace" value="${search}" />` : ""}
    <button class="btn btn-small${confirmText ? " btn-danger" : ""}" type="submit">${label}</button>
  </form>`;

const modDeckRow = (t: Texts, deck: ModDeck, search: string) => {
  const m = t.moderation;
  const visible = !deck.disabled && !deck.ownerDisabled;
  return html`<li class="session${visible ? "" : " is-disabled"}">
  <div class="session-code ${TRACK[deck.kind]}">${deckCount(t, deck)}</div>
  <div class="session-main">
    ${rowTitle(3, visible ? html`<a href="/d/${deck.id}" target="_blank" rel="noopener">${deck.title}</a>` : deck.title)}
    <p class="session-meta">
      ${t.panel.kinds[deck.kind]} · ${m.by(deck.ownerName ?? m.nobody)} · ${m.uploaded(day(deck.createdAt, t))} ·
      <span class="num">${formatBytes(deck.size, t)}</span>
    </p>
    ${deck.disabled
      ? html`<p class="session-warn">${m.deckOff}</p>`
      : deck.ownerDisabled
        ? html`<p class="session-warn">${m.ownerOff}</p>`
        : ""}
  </div>
  <div class="session-actions">
    ${deck.disabled
      ? modForm({ action: `/moderacion/presentaciones/${deck.id}/reactivar`, label: m.enable, search })
      : modForm({
          action: `/moderacion/presentaciones/${deck.id}/desactivar`,
          label: m.disable,
          search,
          confirmText: m.disableDeck(deck.title),
        })}
  </div>
</li>`;
};

const modOwnerRow = (t: Texts, owner: ModOwner, me: string, search: string) => {
  const m = t.moderation;
  return html`<li class="session${owner.disabled ? " is-disabled" : ""}">
  <div class="session-code">
    <span class="session-count num">${owner.decks}</span><span class="session-unit">${t.units.decks(owner.decks)}</span>
  </div>
  <div class="session-main">
    ${rowTitle(3, owner.name)}
    <p class="session-meta">
      ${PROVIDER_LABEL[owner.provider] ?? owner.provider}${owner.email ? html` · ${owner.email}` : ""} ·
      <span class="num">${formatBytes(owner.bytes, t)}</span> · ${m.lastLogin(day(owner.lastLoginAt, t))}
    </p>
    ${owner.disabled ? html`<p class="session-warn">${m.accountOff}</p>` : ""}
  </div>
  <div class="session-actions">
    ${owner.id === me
      ? html`<p class="session-meta">${m.yours}</p>`
      : owner.disabled
        ? modForm({ action: `/moderacion/duenos/${owner.id}/reactivar`, label: m.enableAccount, search })
        : modForm({
            action: `/moderacion/duenos/${owner.id}/desactivar`,
            label: m.disableAccount,
            search,
            confirmText: m.disableOwner(owner.name),
          })}
  </div>
</li>`;
};

/** Lo que encontró «Pegar un enlace»: la presentación o la carpeta, con su Dueño. */
const modFound = (t: Texts, found: Found, me: string, search: string) => {
  const m = t.moderation;
  if (found.type === "control") return html`<p class="flash flash-error" role="alert">${m.controlLink}</p>`;
  if (found.type === "none") return html`<p class="flash flash-error" role="alert">${m.notFound}</p>`;
  const owner = found.owner ? html`<ol class="program" aria-label="${m.owner}">${modOwnerRow(t, found.owner, me, search)}</ol>` : "";
  return html`<section class="mod-section" aria-labelledby="encontrado">
    <h2 class="program-label" id="encontrado">${found.type === "deck" ? m.theDeck : m.theFolder(found.folder.name)}</h2>
    ${found.type === "deck"
      ? html`<ol class="program" aria-label="${m.theDeck}">${modDeckRow(t, found.deck, search)}</ol>`
      : html`<p class="mod-note">${m.folderNote}</p>`}
    ${owner}
  </section>`;
};

export const moderationPage = ({
  t,
  user,
  search,
  found,
  decks,
  owners,
  ok,
  error,
}: {
  t: Texts;
  user: User;
  search: string;
  found: Found | null;
  decks: ModDeck[];
  owners: ModOwner[];
  ok?: string;
  error?: string;
}) => {
  const m = t.moderation;
  const okText = ok ? m.ok[ok] : undefined;
  const errorText = error ? m.errors[error] : undefined;
  return layout({
    t,
    title: titled(t, m.title),
    user,
    page: "panel",
    body: html`<div class="panel-intro mod-intro">
        <h1>${m.title}</h1>
        <p class="mod-lead">${m.lead}</p>
        <form class="mod-search" method="get" action="/moderacion" role="search">
          <label class="visually-hidden" for="enlace">${m.searchLabel}</label>
          <input class="field" id="enlace" name="enlace" value="${search}" required autocomplete="off"
            placeholder="${m.searchPlaceholder}" />
          <button class="btn btn-ink" type="submit">${m.search}</button>
        </form>
      </div>
      ${okText ? html`<p class="flash flash-ok" role="status">${okText}</p>` : ""}
      ${errorText ? html`<p class="flash flash-error" role="alert">${errorText}</p>` : ""}
      ${found ? modFound(t, found, user.id, search) : ""}
      <section class="mod-section" aria-labelledby="recientes">
        <h2 class="program-label" id="recientes">${m.recent}</h2>
        ${decks.length
          ? html`<ol class="program">${decks.map((deck) => modDeckRow(t, deck, search))}</ol>`
          : html`<p class="mod-note">${m.noDecks}</p>`}
      </section>
      <section class="mod-section" aria-labelledby="duenos">
        <h2 class="program-label" id="duenos">${m.owners}</h2>
        <ol class="program">${owners.map((owner) => modOwnerRow(t, owner, user.id, search))}</ol>
      </section>`,
  });
};

/** Mientras no haya administrador: tu id, para copiarlo en ADMIN_USER_IDS. */
export const moderationSetupPage = (t: Texts, user: User) =>
  layout({
    t,
    title: titled(t, t.moderation.title),
    user,
    page: "read",
    body: html`<header class="read-band track-amarillo">
        <div class="read-band-inner"><h1>${t.moderation.title}</h1></div>
      </header>
      <article class="read">
        <p class="read-lead">${t.moderation.setupLead}</p>
        <p>${t.moderation.setupId} <code class="mod-id">${user.id}</code></p>
        <p>${rich(t.moderation.setupText)}</p>
      </article>`,
  });

// ── La skill para tu IA ───────────────────────────────────────────────────

export const skillPage = ({ t, user }: { t: Texts; user: User | null }) => {
  const s = t.skill;
  return layout({
    t,
    title: titled(t, s.title),
    user,
    page: "read",
    index: true,
    body: html`<header class="read-band track-verde">
        <div class="read-band-inner">
          <h1>${s.title}</h1>
          <p class="read-date">${s.sub}</p>
        </div>
      </header>
      <article class="read">
        <p class="read-lead">${s.lead}</p>

        <h2>${s.how}</h2>
        <ol>
          ${s.steps.map((step) => html`<li>${rich(step)}</li>`)}
        </ol>

        <div class="skill-actions">
          <button class="btn btn-ink" type="button" data-copy-skill>${s.copy}</button>
          <a class="btn" href="/skill/html-slides.md" download="html-slides.md">${s.download}</a>
        </div>
        <p class="skill-status" data-skill-status role="status"></p>

        <details class="skill-text">
          <summary>${s.full}</summary>
          <pre data-skill-text>${s.loading}</pre>
        </details>
      </article>`,
  });
};

// ── Privacidad ────────────────────────────────────────────────────────────

export const privacyPage = ({ t, user }: { t: Texts; user: User | null }) => {
  const p = t.privacy;
  return layout({
    t,
    title: titled(t, p.title),
    user,
    page: "read",
    index: true,
    body: html`<header class="read-band track-azul">
        <div class="read-band-inner">
          <h1>${p.title}</h1>
          <p class="read-date">${p.updated}</p>
        </div>
      </header>
      <article class="read">
      <p class="read-lead">${p.lead}</p>

      <h2>${p.whatTitle}</h2>
      <ul>
        ${p.what.map((item) => html`<li>${rich(item)}</li>`)}
      </ul>

      <h2>${p.cookiesTitle}</h2>
      <p>${p.cookies}</p>

      <h2>${p.sharingTitle}</h2>
      <p>${p.sharing}</p>

      <h2>${p.moderationTitle}</h2>
      <p>${p.moderation}</p>

      <h2>${p.deleteTitle}</h2>
      <p>${rich(p.delete)}</p>
    </article>`,
  });
};

// ── Errores y Enlace de la presentación ───────────────────────────────────

export const notFoundPage = (t: Texts, user: User | null = null, what: "presentacion" | "carpeta" = "presentacion") => {
  const n = t.notFound;
  const folder = what === "carpeta";
  return layout({
    t,
    title: titled(t, folder ? n.folder : n.deck),
    user,
    page: "notice",
    body: html`<section class="band track-naranja">
      <div class="band-inner">
        <h1>${folder ? n.folder : n.deck}</h1>
        <p>${folder ? n.folderText : n.deckText}</p>
        <p><a class="btn btn-ink" href="/">${n.home}</a></p>
      </div>
      <span class="stamp">${n.stamp}</span>
    </section>`,
  });
};

/**
 * Página del Enlace de la presentación: ocupa toda la ventana, servida desde su
 * propio origen. Sliding no le pone nada encima (la presentación es del Dueño).
 */
export const viewerPage = ({ t, title, src }: { t: Texts; title: string; src: string }) => html`<!doctype html>
<html lang="${t.lang}">
<head>
  ${head(titled(t, title), { styled: false })}
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
