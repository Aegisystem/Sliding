// Ordenar y mover en el panel (#18, #20, #21). Lo carga app.js cuando hay listas.
//
// Sin JS, el panel ordena por llegada y mueve con «Mover a». Con JS:
// - Subir y Bajar en cada hilera, también con las flechas del teclado.
// - Arrastrar la hilera. Con el mouse se levanta al moverla unos píxeles; con
//   el dedo, al mantenerlo quieto un momento o al tomarla de sus seis puntos.
//   Deslizar sin esperar sigue desplazando la página.
//   Al levantarla, su código y su título se despegan como una ficha que sigue
//   al puntero, y cada hilera se pliega a su título para que todo quede cerca.
//   Soltarla entre hileras cambia el orden; sobre una carpeta de la lista, de
//   la ruta de arriba o del árbol de la izquierda, la mueve ahí y ofrece
//   «Deshacer». Una carpeta cerrada del árbol se abre si la ficha se detiene
//   sobre ella. Esc cancela.
// El orden se guarda solo, en /panel/orden.

const board = document.querySelector(".panel-lists");
const lists = [...document.querySelectorAll("[data-sortable]")];
// Las carpetas de la ruta de arriba y del árbol: reciben lo que se arrastra.
const DROPS = ".crumbs [data-drop], .tree [data-drop]";
const dropTargets = [...document.querySelectorAll(DROPS)];
const orderError = document.querySelector("[data-order-error]");
const moveError = document.querySelector("[data-move-error]");
const orderStatus = document.querySelector("[data-order-status]");
const calm = matchMedia("(prefers-reduced-motion: reduce)");

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const easeOut = (k) => 1 - (1 - k) ** 3;
const FOLD_MS = 260;
const UNFOLD_MS = 340;
const LIFT_MS = 200;
const HOLD_MS = 320;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const plural = (n, one, many) => (n === 1 ? one : many);
const rowsOf = (list) => [...list.children].filter((el) => el.matches("li[data-id]"));
const allRows = () => lists.flatMap((list) => (list.isConnected ? rowsOf(list) : []));
const folderRows = () => allRows().filter((row) => row.parentElement.dataset.sortable === "folders");
const nameOf = (row) => row.querySelector(".session-title")?.textContent.trim() ?? "";
const targetName = (target) => (target.matches("li") ? nameOf(target) : target.textContent.trim());
const destOf = (target) => target.dataset.drop ?? target.dataset.id;
const treeNode = (id) => document.querySelector(`.tree li[data-folder="${CSS.escape(id)}"]`);

// Adónde puede ir: no a la carpeta donde ya está y, si es una carpeta, ni a
// ella misma ni a una de las de dentro.
function allowed(d, el) {
  const dest = destOf(el);
  if (dest === (d.parent ?? "raiz")) return false;
  if (d.kind !== "folders") return true;
  if (dest === d.row.dataset.id) return false;
  return !treeNode(d.row.dataset.id)?.contains(el);
}

// ── Guardar y anunciar el orden ─────────────────────────────────────────

const pending = new Map();
function saveOrder(list) {
  clearTimeout(pending.get(list));
  pending.set(
    list,
    setTimeout(async () => {
      const response = await fetch("/panel/orden", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ parent: list.dataset.parent || null, kind: list.dataset.sortable, ids: rowsOf(list).map((r) => r.dataset.id) }),
      }).catch(() => null);
      if (orderError) orderError.hidden = Boolean(response?.ok);
    }, 350),
  );
}

// La primera no sube y la última no baja. Con aria-disabled el botón conserva el foco.
function markEnds(list) {
  const rows = rowsOf(list);
  rows.forEach((row, i) => {
    row.querySelector('[data-move="up"]')?.setAttribute("aria-disabled", String(i === 0));
    row.querySelector('[data-move="down"]')?.setAttribute("aria-disabled", String(i === rows.length - 1));
  });
}

function moved(row) {
  const list = row.parentElement;
  const rows = rowsOf(list);
  markEnds(list);
  if (orderStatus) orderStatus.textContent = `«${nameOf(row)}» quedó en el lugar ${rows.indexOf(row) + 1} de ${rows.length}.`;
  saveOrder(list);
}

// Se mueve la vecina, nunca la hilera misma: así conserva el foco del teclado.
// Las hileras se deslizan a su lugar nuevo en vez de saltar.
function moveRow(row, place) {
  const list = row.parentElement;
  const before = new Map(rowsOf(list).map((r) => [r, r.getBoundingClientRect().top]));
  place();
  if (calm.matches) return;
  for (const r of rowsOf(list)) {
    const delta = before.get(r) - r.getBoundingClientRect().top;
    if (delta) r.animate([{ transform: `translateY(${delta}px)` }, { transform: "none" }], { duration: 180, easing: EASE });
  }
}

function step(row, dir) {
  const sibling = dir === "up" ? row.previousElementSibling : row.nextElementSibling;
  if (!sibling) return;
  moveRow(row, () => (dir === "up" ? row.after(sibling) : row.before(sibling)));
  moved(row);
}

// Subir y Bajar, con dos hileras o más. Se arrastra si hay adónde: otro lugar
// en la lista, una carpeta de la lista, de la ruta o del árbol.
function setUp(list) {
  const rows = rowsOf(list);
  const ordering = rows.length > 1;
  for (const button of list.querySelectorAll("[data-move]")) button.hidden = !ordering;
  if (ordering) markEnds(list);
  const probe = rows.length && { kind: list.dataset.sortable, parent: list.dataset.parent || null, row: rows[0] };
  const somewhere =
    ordering ||
    (list.dataset.sortable === "decks" && folderRows().length > 0) ||
    Boolean(probe && dropTargets.some((el) => allowed(probe, el)));
  list.classList.toggle("is-sortable", somewhere);
}

// ── Plegar: cada hilera queda en su código y su título ───────────────────
// Las alturas se animan de una en una. Mientras tanto, una hilera (la que se
// levantó, o donde cayó) se queda quieta en la pantalla: la página se
// desplaza para compensar y, si ya no puede subir más, se abre un espacio
// arriba de las listas que se cierra al desplegar.

let pad = 0;
let folding = null;

function setPad(value) {
  pad = Math.max(0, value);
  board.style.paddingTop = pad ? `${pad}px` : "";
}

function hold(el, top) {
  let drift = el.getBoundingClientRect().top - top;
  if (drift > 0.5 && pad > 0) {
    const take = Math.min(pad, drift);
    setPad(pad - take);
    drift -= take;
  }
  if (Math.abs(drift) > 0.5) scrollBy(0, drift);
  const rest = el.getBoundingClientRect().top - top;
  if (rest < -0.5) setPad(pad - rest);
}

/**
 * Pliega (o despliega) las listas. `anchor` se queda quieta; `place`, si viene,
 * dice dónde debe terminar su borde de arriba según su altura nueva.
 */
function fold(on, anchor, place) {
  const rows = allRows();
  const before = rows.map((r) => r.getBoundingClientRect().height);
  const top0 = anchor?.getBoundingClientRect().top ?? 0;
  folding?.anims.forEach((a) => a.cancel());
  board.classList.toggle("is-folded", on);
  const after = rows.map((r) => r.getBoundingClientRect().height);
  const top1 = place && anchor ? place(anchor.getBoundingClientRect().height) : top0;
  const duration = calm.matches ? 0 : on ? FOLD_MS : UNFOLD_MS;
  const anims = [];
  if (duration) {
    board.classList.add("is-folding");
    rows.forEach((r, i) => {
      if (Math.abs(after[i] - before[i]) > 0.5) {
        anims.push(r.animate([{ height: `${before[i]}px` }, { height: `${after[i]}px` }], { duration, easing: EASE }));
      }
    });
  }
  const state = { anims };
  folding = state;
  const start = performance.now();
  return new Promise((resolve) => {
    const frame = () => {
      if (folding !== state) return resolve(false);
      const k = duration ? Math.min(1, (performance.now() - start) / duration) : 1;
      if (anchor?.isConnected) hold(anchor, top0 + (top1 - top0) * easeOut(k));
      if (k < 1) return requestAnimationFrame(frame);
      board.classList.remove("is-folding");
      if (!on) {
        // Lo que quedó del espacio de arriba se cierra sin mover la hilera.
        if (pad) {
          const left = pad;
          setPad(0);
          scrollBy(0, -left);
        }
        document.body.style.minHeight = "";
      }
      folding = null;
      resolve(true);
    };
    frame();
  });
}

// ── Arrastrar ─────────────────────────────────────────────────────────────

let drag = null;
// Mientras una ficha baja a su hueco o entra en una carpeta, no se levanta otra.
let busy = false;

function makeFicha(row) {
  const ficha = document.createElement("div");
  ficha.className = "ficha";
  ficha.setAttribute("aria-hidden", "true");
  const code = row.querySelector(".session-code").cloneNode(true);
  code.querySelectorAll(".order").forEach((button) => button.remove());
  const title = document.createElement("span");
  title.className = "ficha-title";
  title.textContent = nameOf(row);
  ficha.append(code, title);
  return ficha;
}

function lift(gesture) {
  const { row, how } = gesture;
  const list = row.parentElement;
  const rect = row.getBoundingClientRect();
  const x = gesture.x;
  const y = gesture.y;
  const ficha = makeFicha(row);
  // Adónde va: una etiqueta junto al puntero, aparte de la ficha para que no se encoja con ella.
  const tag = document.createElement("span");
  tag.className = "ficha-tag";
  tag.setAttribute("aria-hidden", "true");
  tag.hidden = true;
  document.body.append(ficha, tag);
  const fw = ficha.offsetWidth;
  const fh = ficha.offsetHeight;
  // La ficha nace sobre el código y el título de la hilera y se acomoda bajo
  // el puntero. Con el dedo queda arriba de él, para que no la tape.
  const from = { x: x - rect.left, y: y - rect.top };
  const to = { x: clamp(from.x, 24, fw - 24), y: how === "touch" ? fh + 12 : clamp(from.y, 12, fh - 12) };
  ficha.style.transformOrigin = `${to.x}px ${to.y}px`;
  ficha.style.transform = `translate(${rect.left}px, ${rect.top}px)`;

  drag = {
    gesture,
    how,
    row,
    list,
    ficha,
    tag,
    kind: list.dataset.sortable,
    parent: list.dataset.parent || null,
    start: rowsOf(list).indexOf(row),
    startIds: rowsOf(list).map((r) => r.dataset.id),
    x,
    y,
    from,
    to,
    t0: performance.now(),
    lastX: x,
    vx: 0,
    tilt: 0,
    scale: 1,
    ax: from.x,
    ay: from.y,
    fh,
    target: null,
    ready: false,
    raf: 0,
  };
  const d = drag;
  gesture.lifted = true;
  for (const menu of document.querySelectorAll("details.more[open]")) menu.open = false;
  // Solo se marcan las carpetas que pueden recibirla.
  for (const el of dropTargets) el.classList.toggle("can-drop", allowed(d, el));
  document.body.style.minHeight = `${document.documentElement.scrollHeight}px`;
  document.documentElement.classList.add("is-sorting");
  row.classList.add("is-held");
  // La hilera queda bajo el puntero: si se tomó muy abajo, su mitad.
  fold(true, row, (height) => y - Math.min(from.y, height / 2)).then((done) => {
    if (done && drag === d) d.ready = true;
  });
  requestAnimationFrame(() => ficha.classList.add("is-up"));
  addEventListener("keydown", onKey, true);
  d.raf = requestAnimationFrame(tick);
}

function tick(now) {
  const d = drag;
  if (!d) return;
  if (d.ready) {
    autoscroll(d);
    aim(d);
  }
  // La ficha sigue al puntero y se mece con la velocidad, como la credencial.
  // Sobre una carpeta se encoge un poco, como a punto de entrar, y deja ver adónde va.
  const k = calm.matches ? 1 : easeOut(Math.min(1, (now - d.t0) / LIFT_MS));
  const gx = d.from.x + (d.to.x - d.from.x) * k;
  const gy = d.from.y + (d.to.y - d.from.y) * k;
  d.vx += (d.x - d.lastX - d.vx) * 0.3;
  d.lastX = d.x;
  d.tilt += ((calm.matches ? 0 : clamp(d.vx * 0.5, -6, 6)) - d.tilt) * 0.2;
  // Sobre el árbol se encoge más y sube arriba a la derecha del puntero: los
  // nombres son chicos y la ficha no debe tapar el que se apunta.
  const inTree = Boolean(d.target?.matches(".tree-link"));
  const goal = calm.matches ? 1 : inTree ? 0.45 : d.target ? 0.6 : 1 + 0.03 * k;
  d.scale += (goal - d.scale) * (calm.matches ? 1 : 0.25);
  const follow = calm.matches || !d.ready ? 1 : 0.25;
  d.ax += ((inTree ? -12 : gx) - d.ax) * follow;
  d.ay += ((inTree ? d.fh + 44 : gy) - d.ay) * follow;
  // Nunca se sale por la izquierda: si el puntero se acerca al borde, la ficha se corre.
  const left = Math.max(d.x - d.ax, Math.min(8, d.x - 24));
  d.ficha.style.transformOrigin = `${d.x - left}px ${d.ay}px`;
  d.ficha.style.transform = `translate(${left}px, ${d.y - d.ay}px) rotate(${d.tilt.toFixed(2)}deg) scale(${d.scale.toFixed(3)})`;
  if (!d.tag.hidden) {
    // Con el mouse, abajo a la derecha del puntero; con el dedo, arriba de la ficha.
    const tx = clamp(d.x + (d.how === "touch" ? -d.tag.offsetWidth / 2 : 16), 8, innerWidth - d.tag.offsetWidth - 8);
    const ty = Math.max(8, d.how === "touch" ? d.y - d.ay - d.tag.offsetHeight - 12 : d.y + 22);
    d.tag.style.transform = `translate(${tx}px, ${ty}px)`;
  }
  d.raf = requestAnimationFrame(tick);
}

// Cerca del borde de la ventana, la página se desplaza sola, más rápido cuanto más cerca.
function autoscroll(d) {
  const edge = Math.min(96, innerHeight * 0.15);
  let speed = 0;
  if (d.y < edge) speed = -(((edge - d.y) / edge) ** 2) * 24;
  else if (d.y > innerHeight - edge) speed = ((d.y - (innerHeight - edge)) / edge) ** 2 * 24;
  if (speed) scrollBy(0, speed);
}

// Qué hay bajo el puntero: una carpeta de la ruta o del árbol, una carpeta de
// la lista o un lugar entre hileras. Una carpeta de la misma lista recibe solo
// en su mitad del medio; arriba o abajo de eso, la hilera se pone antes o después.
function aim(d) {
  const under = document.elementFromPoint(d.x, d.y);
  let target = under?.closest(DROPS) ?? null;
  if (target && !allowed(d, target)) target = null;
  if (!target) {
    const row = under?.closest('[data-sortable="folders"] > li[data-id]');
    if (row && row !== d.row) {
      if (row.parentElement !== d.list) target = row;
      else {
        const r = row.getBoundingClientRect();
        const f = (d.y - r.top) / r.height;
        if (f > 0.25 && f < 0.75) target = row;
      }
    }
  }
  point(d, target);
  // Sobre el árbol o la ruta, el hueco se queda donde está.
  if (!target && !under?.closest(".panel-side, .crumbs")) reorder(d);
}

// Una carpeta cerrada del árbol se abre si la ficha se detiene sobre ella.
const SPRING_MS = 650;

function point(d, target) {
  if (d.target === target) return;
  clearTimeout(d.spring);
  if (target?.matches(".tree-link")) {
    const toggle = target.closest("li").querySelector(':scope > .tree-row > .tree-toggle[aria-expanded="false"]');
    if (toggle) d.spring = setTimeout(() => drag === d && d.target === target && toggle.click(), SPRING_MS);
  }
  d.target?.classList.remove("is-drop-target");
  d.target = target;
  target?.classList.add("is-drop-target");
  d.tag.hidden = !target;
  if (target) d.tag.textContent = `Mover a «${targetName(target)}»`;
  d.row.classList.toggle("is-leaving", Boolean(target));
  d.ficha.classList.toggle("is-over", Boolean(target));
}

// Se compara con el lugar de cada hilera en la lista, no con donde se ve:
// mientras se desliza, la vecina todavía se dibuja en su lugar anterior.
function reorder(d) {
  const { row, list } = d;
  const y = d.y - list.getBoundingClientRect().top;
  const middle = (r) => r.offsetTop + r.offsetHeight / 2;
  let prev = row.previousElementSibling;
  let changed = false;
  while (prev && y < middle(prev)) {
    const p = prev;
    moveRow(row, () => row.after(p));
    prev = row.previousElementSibling;
    changed = true;
  }
  if (changed) return;
  let next = row.nextElementSibling;
  while (next && y > middle(next)) {
    const n = next;
    moveRow(row, () => row.before(n));
    next = row.nextElementSibling;
  }
}

function onKey(event) {
  if (event.key !== "Escape" || !drag) return;
  event.preventDefault();
  event.stopPropagation();
  release(true);
}

function release(cancel = false) {
  const d = drag;
  if (!d) return;
  drag = null;
  cancelAnimationFrame(d.raf);
  clearTimeout(d.spring);
  d.gesture.over = true;
  removeEventListener("keydown", onKey, true);
  document.documentElement.classList.remove("is-sorting");
  for (const el of dropTargets) el.classList.remove("can-drop");
  d.row.classList.remove("is-leaving");
  d.tag.remove();
  if (cancel || !d.target) d.target?.classList.remove("is-drop-target");
  busy = true;
  (!cancel && d.target ? intoFolder(d) : settle(d, cancel)).finally(() => (busy = false));
}

// Vuelve a ponerla donde estaba al empezar.
function restore(d) {
  const others = rowsOf(d.list).filter((r) => r !== d.row);
  if (rowsOf(d.list).indexOf(d.row) === d.start) return;
  const ref = others[d.start];
  moveRow(d.row, () => (ref ? ref.before(d.row) : others.at(-1).after(d.row)));
}

// Soltarla entre hileras: la ficha baja a su hueco y la lista se despliega.
async function settle(d, cancel) {
  if (cancel) restore(d);
  const { row, ficha } = d;
  ficha.classList.remove("is-up");
  if (!calm.matches) {
    const slot = row.getBoundingClientRect();
    await ficha
      .animate([{ transform: ficha.style.transform }, { transform: `translate(${slot.left}px, ${slot.top}px)` }], {
        duration: 200,
        easing: EASE,
        fill: "forwards",
      })
      .finished.catch(() => {});
  }
  row.classList.remove("is-held");
  if (calm.matches) ficha.remove();
  else ficha.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: "forwards" }).finished.then(() => ficha.remove());
  fold(false, row);
  if (!cancel && rowsOf(d.list).indexOf(row) !== d.start) moved(row);
}

// Soltarla sobre una carpeta: la ficha entra en ella, su hueco se cierra y el
// número de la carpeta sube. Si el servidor no la mueve, vuelve a su lugar.
async function intoFolder(d) {
  const { row, list, target, ficha, kind } = d;
  const name = nameOf(row);
  const where = targetName(target);
  const url = `/panel/${kind === "decks" ? "decks" : "carpetas"}/${row.dataset.id}/mover`;
  const send = (destino) => {
    const body = new FormData();
    body.append("destino", destino);
    return fetch(url, { method: "POST", body, headers: { accept: "application/json" } });
  };
  const dest = destOf(target);
  // La hilera de la carpeta que recibe, si está en la lista (también cuando se soltó en el árbol).
  const folderRow = target.matches("li") ? target : (folderRows().find((r) => r.dataset.id === dest) ?? null);
  const request = send(dest).then(
    (response) => response.ok,
    () => false,
  );

  ficha.classList.remove("is-up");
  const goal = (target.querySelector(".session-code") ?? target).getBoundingClientRect();
  // En el árbol, la ficha entra por el comienzo del nombre.
  if (target.matches(".tree-link")) goal.width = Math.min(goal.width, 48);
  const [ox, oy] = ficha.style.transformOrigin.split(" ").map(parseFloat);
  const gx = goal.left + goal.width / 2 - ox;
  const gy = goal.top + goal.height / 2 - oy;
  const anims = [];
  if (!calm.matches) {
    const opacity = getComputedStyle(ficha).opacity;
    anims.push(
      ficha.animate(
        [
          { transform: ficha.style.transform, opacity },
          { opacity, offset: 0.6 },
          { transform: `translate(${gx}px, ${gy}px) scale(0.15)`, opacity: 0 },
        ],
        { duration: 340, easing: "cubic-bezier(0.5, 0, 0.2, 1)", fill: "forwards" },
      ),
      row.animate([{ height: `${row.getBoundingClientRect().height}px` }, { height: "0px" }], {
        duration: 280,
        easing: EASE,
        fill: "forwards",
      }),
    );
  }
  row.style.overflow = "clip";
  const ok = await request;
  await Promise.all(anims.map((a) => a.finished.catch(() => {})));
  ficha.remove();
  // La carpeta se queda verde hasta que la ficha entra, y se apaga.
  target.classList.remove("is-drop-target");

  if (!ok) {
    anims.forEach((a) => a.cancel());
    row.style.overflow = "";
    row.classList.remove("is-held");
    restore(d);
    fold(false, row);
    if (moveError) {
      moveError.textContent = `No se pudo mover «${name}». Recarga la página e intenta de nuevo.`;
      moveError.hidden = false;
    }
    return;
  }

  const anchor = target.matches("li") ? target : (allRows().find((r) => r !== row) ?? null);
  row.remove();
  if (folderRow) bump(folderRow, kind);
  if (kind === "folders") moveInTree(row.dataset.id, dest);
  tidy(list);
  fold(false, anchor);
  offerUndo(`«${name}» quedó en «${where}».`, async () => {
    const back = await send(d.parent ?? "raiz");
    if (!back.ok) throw new Error("no se pudo deshacer");
    await fetch("/panel/orden", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ parent: d.parent, kind, ids: d.startIds }),
    });
  });
}

// La carpeta que recibe suma una presentación (con su número) o una carpeta.
function bump(target, kind) {
  if (kind === "decks") {
    const n = Number(target.dataset.decks ?? 0) + 1;
    target.dataset.decks = String(n);
    const count = target.querySelector(".session-count");
    count.textContent = String(n);
    target.querySelector(".session-unit").textContent = plural(n, "presentación", "presentaciones");
    if (!calm.matches) {
      count.animate([{ transform: "translateY(-0.5em)", opacity: 0 }, { transform: "none", opacity: 1 }], {
        duration: 360,
        delay: 60,
        easing: EASE,
        fill: "backwards",
      });
    }
  } else {
    const n = Number(target.dataset.folders ?? 0) + 1;
    target.dataset.folders = String(n);
    const number = document.createElement("span");
    number.className = "num";
    number.textContent = String(n);
    target.querySelector(".session-meta").replaceChildren("Carpeta · ", number, ` ${plural(n, "carpeta", "carpetas")} dentro`);
  }
}

// En el árbol, la carpeta movida pasa a su nueva carpeta, que se abre para
// mostrarla, y se marca un momento.
function moveInTree(id, dest) {
  const node = treeNode(id);
  const home = treeNode(dest);
  if (!node || !home) return;
  const from = node.parentElement;
  let branch = home.querySelector(":scope > .tree-list");
  if (!branch) {
    branch = document.createElement("ul");
    branch.className = "tree-list";
    home.append(branch);
    const spot = home.querySelector(":scope > .tree-row > .tree-toggle");
    if (spot) {
      const toggle = document.createElement("button");
      toggle.className = "tree-toggle";
      toggle.type = "button";
      toggle.setAttribute("aria-label", `Carpetas de «${home.querySelector(".tree-link").textContent.trim()}»`);
      toggle.innerHTML = document.querySelector(".panel-side svg")?.outerHTML ?? "";
      spot.replaceWith(toggle);
    }
  }
  branch.append(node);
  // La carpeta de donde salió, si quedó sin carpetas, pierde su flecha.
  if (!from.children.length && from.parentElement.dataset.folder !== "raiz") {
    const owner = from.parentElement;
    from.remove();
    const spot = document.createElement("span");
    spot.className = "tree-toggle";
    spot.setAttribute("aria-hidden", "true");
    owner.querySelector(":scope > .tree-row > .tree-toggle")?.replaceWith(spot);
  }
  for (let item = home; item; item = item.parentElement.closest("li[data-folder]")) {
    item.querySelector(":scope > .tree-row > .tree-toggle")?.setAttribute("aria-expanded", "true");
    const list = item.querySelector(":scope > .tree-list");
    if (list) list.hidden = false;
  }
  const row = node.querySelector(":scope > .tree-row");
  row.classList.remove("is-new");
  void row.offsetWidth;
  row.classList.add("is-new");
}

// Sin la hilera que se fue: una lista vacía se quita con su rótulo y, si no
// queda ninguna, aparece el aviso de carpeta vacía.
function tidy(list) {
  if (!rowsOf(list).length) {
    const label = list.previousElementSibling;
    if (label?.matches(".program-label")) label.remove();
    list.remove();
  }
  for (const l of lists) if (l.isConnected) setUp(l);
  if (!allRows().length) document.querySelector("[data-empty]")?.removeAttribute("hidden");
}

// ── Deshacer ──────────────────────────────────────────────────────────────

let bar = null;
let barTimer = 0;

function offerUndo(text, undo) {
  if (!bar) {
    bar = document.createElement("div");
    bar.className = "undo-bar";
    bar.innerHTML = '<p role="status"></p><button class="btn btn-small" type="button">Deshacer</button>';
    document.body.append(bar);
    bar.addEventListener("pointerenter", () => clearTimeout(barTimer));
    bar.addEventListener("pointerleave", later);
    bar.addEventListener("focusin", () => clearTimeout(barTimer));
    bar.addEventListener("focusout", later);
  }
  const [message, button] = bar.children;
  message.textContent = text;
  button.disabled = false;
  button.onclick = async () => {
    button.disabled = true;
    clearTimeout(barTimer);
    message.textContent = "Deshaciendo…";
    try {
      await undo();
      location.reload();
    } catch {
      message.textContent = "No se pudo deshacer. Recarga la página e intenta de nuevo.";
      button.disabled = false;
    }
  };
  const wasHidden = bar.hidden || !bar.isConnected;
  bar.hidden = false;
  bar.getAnimations().forEach((a) => a.cancel());
  if (wasHidden && !calm.matches) bar.animate([{ transform: "translateY(100%)" }, { transform: "none" }], { duration: 300, easing: EASE });
  later();
}

function later() {
  clearTimeout(barTimer);
  barTimer = setTimeout(async () => {
    if (!calm.matches) {
      await bar.animate([{ transform: "none" }, { transform: "translateY(100%)" }], { duration: 200, easing: "ease-in", fill: "forwards" }).finished.catch(() => {});
    }
    bar.hidden = true;
    bar.getAnimations().forEach((a) => a.cancel());
  }, 8000);
}

// ── Tomar la hilera ──────────────────────────────────────────────────────

// El nombre de una carpeta es un enlace, pero también se toma para arrastrarla:
// un clic sin mover la abre.
const CONTROLS = "a:not(.session-title a), button, input, select, label, textarea, form, details";
const TOUCH_CONTROLS = "button, input, select, label, textarea, form, details, .btn";

function grabbable(target, list, controls) {
  const row = target.closest("li[data-id]");
  if (!row || row.parentElement !== list || !list.classList.contains("is-sortable") || drag || busy) return null;
  if (target.closest(controls) && !target.closest(".drag-hint")) return null;
  return row;
}

// Después de arrastrar sobre un enlace, el clic o el toque no lo abre.
let swallowClick = false;
document.addEventListener(
  "click",
  (event) => {
    if (!swallowClick) return;
    swallowClick = false;
    event.preventDefault();
    event.stopPropagation();
  },
  true,
);

for (const list of lists) {
  setUp(list);

  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-move]");
    if (button && button.getAttribute("aria-disabled") !== "true") step(button.closest("li"), button.dataset.move);
  });

  list.addEventListener("keydown", (event) => {
    const button = event.target.closest("[data-move]");
    if (!button || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
    event.preventDefault();
    step(button.closest("li"), event.key === "ArrowUp" ? "up" : "down");
  });

  // Con el mouse, la hilera entera se arrastra desde cualquier parte que no
  // sea un control. Empieza al moverse unos píxeles, así un clic sigue siendo un clic.
  list.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch" || event.button !== 0) return;
    const row = grabbable(event.target, list, CONTROLS);
    if (!row) return;
    event.preventDefault();
    const gesture = { row, how: "mouse", x: event.clientX, y: event.clientY, lifted: false, over: false };
    const id = event.pointerId;
    const move = (e) => {
      if (e.pointerId !== id || gesture.over) return;
      if (!gesture.lifted) {
        if (Math.hypot(e.clientX - gesture.x, e.clientY - gesture.y) < 5) return;
        // Se captura recién al levantarla: un clic sin mover sigue llegando al
        // nombre de la carpeta y la abre.
        list.setPointerCapture(id);
        lift(gesture);
      }
      drag.x = e.clientX;
      drag.y = e.clientY;
    };
    const up = (e) => {
      if (e.pointerId !== id) return;
      list.removeEventListener("pointermove", move);
      list.removeEventListener("pointerup", up);
      list.removeEventListener("pointercancel", up);
      if (!gesture.lifted || gesture.over) return;
      swallowClick = true;
      setTimeout(() => (swallowClick = false), 400);
      release(e.type === "pointercancel");
    };
    list.addEventListener("pointermove", move);
    list.addEventListener("pointerup", up);
    list.addEventListener("pointercancel", up);
  });

  // Con el dedo: mantenerlo quieto levanta la hilera; desde los seis puntos,
  // al instante. Mientras está levantada, el dedo no desplaza la página.
  list.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length > 1) return;
      const row = grabbable(event.target, list, TOUCH_CONTROLS);
      if (!row) return;
      const touch = event.changedTouches[0];
      const gesture = { row, how: "touch", x: touch.clientX, y: touch.clientY, lifted: false, over: false };
      const x0 = touch.clientX;
      const y0 = touch.clientY;
      const start = () => {
        if (gesture.over || drag) return;
        lift(gesture);
        navigator.vibrate?.(8);
      };
      const handle = event.target.closest(".drag-hint");
      const timer = handle ? 0 : setTimeout(start, HOLD_MS);
      if (handle) {
        event.preventDefault();
        start();
      }
      const find = (e) => [...e.changedTouches].find((t) => t.identifier === touch.identifier);
      const move = (e) => {
        const t = find(e);
        if (!t || gesture.over) return;
        gesture.x = t.clientX;
        gesture.y = t.clientY;
        if (gesture.lifted) {
          e.preventDefault();
          drag.x = t.clientX;
          drag.y = t.clientY;
        } else if (Math.hypot(t.clientX - x0, t.clientY - y0) > 10) {
          done();
        }
      };
      const end = (e) => {
        if (!find(e)) return;
        done();
        if (!gesture.lifted || gesture.over) return;
        if (e.cancelable) e.preventDefault();
        swallowClick = true;
        setTimeout(() => (swallowClick = false), 400);
        release(e.type === "touchcancel");
      };
      function done() {
        clearTimeout(timer);
        document.removeEventListener("touchmove", move);
        document.removeEventListener("touchend", end);
        document.removeEventListener("touchcancel", end);
      }
      document.addEventListener("touchmove", move, { passive: false });
      document.addEventListener("touchend", end);
      document.addEventListener("touchcancel", end);
    },
    { passive: false },
  );

  // El navegador no arrastra el enlace del nombre por su cuenta: lo hace drag.js.
  list.addEventListener("dragstart", (event) => event.preventDefault());

  // Mantener el dedo sobre un enlace abre su menú: mientras se arrastra, no.
  list.addEventListener("contextmenu", (event) => {
    if (drag) event.preventDefault();
  });
}

// Si la ventana pierde el foco a mitad de camino, todo vuelve a su lugar.
addEventListener("blur", () => release(true));
