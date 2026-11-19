// El Control: se une a la Sesión en vivo con el QR de control (una sola vez)
// y después se reconecta con la llave que queda guardada en este celular.
// Muestra las notas, las vistas previas, el cronómetro, el reloj y la lista
// para saltar; con una presentación genérica, solo anterior y siguiente.

const body = document.body;
const sessionId = body.dataset.session;
const decksOrigin = body.dataset.decksOrigin;
const $ = (selector) => document.querySelector(selector);

const ui = {
  title: $("[data-title]"),
  count: $("[data-count]"),
  meta: $("[data-meta]"),
  clock: $("[data-clock]"),
  timer: $("[data-timer]"),
  timerReset: $("[data-timer-reset]"),
  main: $("[data-main]"),
  previews: $("[data-previews]"),
  next: $('[data-preview="next"]'),
  nextTitle: $("[data-next-title]"),
  previewEnd: $("[data-preview-end]"),
  notesBox: $("[data-notes-box]"),
  notes: $("[data-notes]"),
  openList: $("[data-open-list]"),
  list: $("[data-list]"),
  listItems: $("[data-list-items]"),
  foot: $("[data-foot]"),
  box: $("[data-state-box]"),
  boxTitle: $("[data-state-title]"),
  boxText: $("[data-state-text]"),
};

const saved = (key) => ({
  get() {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(value) {
    try {
      localStorage.setItem(key, value);
    } catch {}
  },
  clear() {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
});
const controlKey = saved(`sliding:control:${sessionId}`);
const timerStore = saved(`sliding:timer:${sessionId}`);

// ── Estado de la presentación ─────────────────────────────────────────────

const state = { title: "", kind: "generic", index: 0, total: null, slides: null, deckId: null };

function render() {
  if (state.title) {
    ui.title.textContent = state.title;
    document.title = `Control · ${state.title} · Sliding`;
  }
  const known = Number.isInteger(state.total);
  ui.count.textContent = known ? `${state.index + 1} / ${state.total}` : "";

  // html-slides y PDF se controlan por completo; una genérica, solo con anterior y siguiente.
  const controllable = state.kind === "html-slides" || state.kind === "pdf";
  const slides = controllable ? slideList() : null;
  // Un PDF tiene notas solo si el Dueño agregó su .pptx.
  const hasNotes = controllable && Array.isArray(state.slides);
  body.classList.toggle("is-generic", !controllable);
  body.classList.toggle("is-without-notes", controllable && !hasNotes);
  ui.previews.hidden = !controllable || !state.deckId;
  ui.notesBox.hidden = !hasNotes;
  ui.openList.hidden = !slides;
  if (hasNotes) {
    const notes = slides?.[state.index]?.notes ?? "";
    ui.notes.textContent = notes || "Esta diapositiva no tiene notas.";
    ui.notes.classList.toggle("is-empty", !notes);
    ui.notesBox.scrollTop = 0;
  }
  if (slides) renderList(slides);
  showPreviews();
}

/**
 * La lista de diapositivas con sus títulos y notas. En un PDF, las notas del
 * .pptx se emparejan con las páginas por número; si no hay notas, o faltan,
 * cada página va sin título.
 */
function slideList() {
  const blank = (n) => Array.from({ length: n }, () => ({ title: "", notes: "" }));
  const known = Number.isInteger(state.total);
  if (state.kind !== "pdf") return Array.isArray(state.slides) ? state.slides : null;
  if (!known) return Array.isArray(state.slides) ? state.slides : null;
  const notes = Array.isArray(state.slides) ? state.slides.slice(0, state.total) : [];
  return [...notes, ...blank(state.total - notes.length)];
}

// ── Vista previa de la que sigue: la misma presentación, en miniatura ─────

const PREVIEW_WIDTH = 1280;
let previewsLoaded = false;

function loadPreviews() {
  if (previewsLoaded || ui.previews.hidden || !state.deckId) return;
  previewsLoaded = true;
  ui.next.addEventListener("load", showPreviews);
  // `?previa` le dice al visor de PDF que dibuje una miniatura; las HTML no lo usan.
  ui.next.src = `${decksOrigin}/v/${state.deckId}?previa`;
}

function showPreviews() {
  if (ui.previews.hidden) return;
  loadPreviews();
  const last = Number.isInteger(state.total) && state.index + 1 >= state.total;
  ui.previewEnd.hidden = !last;
  const nextTitle = state.slides?.[state.index + 1]?.title;
  ui.nextTitle.textContent = last ? "Sigue: fin de la presentación" : `Sigue: ${nextTitle || `diapositiva ${state.index + 2}`}`;
  if (!last) ui.next.contentWindow?.postMessage({ sliding: 1, type: "go", to: state.index + 1 }, decksOrigin);
}

// Las miniaturas se dibujan a 1280 de ancho y se escalan a su caja.
const resize = new ResizeObserver((entries) => {
  for (const entry of entries) {
    entry.target.style.setProperty("--preview-scale", String(entry.contentRect.width / PREVIEW_WIDTH));
  }
});
for (const frame of document.querySelectorAll(".preview-frame")) resize.observe(frame);

// ── Lista para saltar ─────────────────────────────────────────────────────

function renderList(slides) {
  ui.listItems.replaceChildren(
    ...slides.map((slide, index) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.jump = String(index);
      if (index === state.index) button.setAttribute("aria-current", "true");
      const number = document.createElement("span");
      number.className = "num";
      number.textContent = String(index + 1);
      const label = document.createElement("span");
      label.textContent = slide.title || `Diapositiva ${index + 1}`;
      button.append(number, label);
      item.append(button);
      return item;
    }),
  );
}

ui.openList.addEventListener("click", () => {
  ui.list.showModal();
  ui.listItems.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "center" });
});

ui.listItems.addEventListener("click", (event) => {
  const button = event.target.closest("[data-jump]");
  if (!button) return;
  go(Number(button.dataset.jump));
  ui.list.close();
});

// ── Cronómetro y reloj ────────────────────────────────────────────────────

// El cronómetro arranca con la primera diapositiva que se avanza y se pausa al tocarlo.
let timer = { startedAt: null, pausedAt: null };
try {
  timer = { ...timer, ...JSON.parse(timerStore.get() ?? "{}") };
} catch {}
const saveTimer = () => timerStore.set(JSON.stringify(timer));

function elapsed() {
  if (!timer.startedAt) return 0;
  return (timer.pausedAt ?? Date.now()) - timer.startedAt;
}

function startTimer() {
  if (timer.startedAt) return;
  timer = { startedAt: Date.now(), pausedAt: null };
  saveTimer();
}

function formatElapsed(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

const clockFormat = new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit" });

function tick() {
  ui.timer.textContent = formatElapsed(elapsed());
  ui.timer.classList.toggle("is-paused", Boolean(timer.pausedAt));
  ui.timer.classList.toggle("is-idle", !timer.startedAt);
  ui.clock.textContent = clockFormat.format(new Date());
}

ui.timer.addEventListener("click", () => {
  if (!timer.startedAt) startTimer();
  else if (timer.pausedAt) {
    timer.startedAt += Date.now() - timer.pausedAt;
    timer.pausedAt = null;
    saveTimer();
  } else {
    timer.pausedAt = Date.now();
    saveTimer();
  }
  tick();
});

ui.timerReset.addEventListener("click", () => {
  timer = { startedAt: null, pausedAt: null };
  saveTimer();
  tick();
});

setInterval(tick, 1000);
tick();

// ── Pantalla encendida ────────────────────────────────────────────────────

let wakeLock = null;
async function keepAwake() {
  if (!("wakeLock" in navigator) || document.visibilityState !== "visible" || wakeLock) return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => {
      wakeLock = null;
    });
  } catch {}
}
document.addEventListener("visibilitychange", keepAwake);

// ── Conexión ──────────────────────────────────────────────────────────────

let pairToken = location.hash.slice(1);
let socket = null;
let retries = 0;
let finished = false;

function show(heading, text = "") {
  ui.main.hidden = true;
  ui.meta.hidden = true;
  ui.foot.hidden = true;
  ui.box.hidden = false;
  ui.boxTitle.textContent = heading;
  ui.boxText.textContent = text;
}

function ready() {
  ui.main.hidden = false;
  ui.meta.hidden = false;
  ui.foot.hidden = false;
  ui.box.hidden = true;
  keepAwake();
}

function finish(heading, text) {
  finished = true;
  if (ui.list.open) ui.list.close();
  show(heading, text);
}

const send = (msg) => {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg));
};

function go(to) {
  startTimer();
  send({ type: "go", to });
}

function connect() {
  const key = controlKey.get();
  const query = key ? `key=${encodeURIComponent(key)}` : pairToken ? `pair=${encodeURIComponent(pairToken)}` : null;
  if (!query) {
    return finish("Escanea el QR de la Pantalla", "Abre el Enlace para presentar en el computador y escanea su QR con este celular.");
  }
  const scheme = location.protocol === "https:" ? "wss:" : "ws:";
  const current = new WebSocket(`${scheme}//${location.host}/live/${sessionId}/control?${query}`);
  socket = current;
  // Una conexión reemplazada (por ejemplo, al escanear un QR nuevo) ya no cuenta.
  current.addEventListener("open", () => {
    retries = 0;
  });
  current.addEventListener("message", (event) => {
    if (current !== socket) return;
    try {
      handle(JSON.parse(event.data), Boolean(key));
    } catch {}
  });
  current.addEventListener("close", (event) => {
    if (current !== socket || finished || event.code === 4003) return;
    if (event.code === 4000) return finish("La sesión terminó", "Puedes cerrar esta página.");
    if (event.code === 4001) {
      controlKey.clear();
      return finish("Otro celular tomó el control", "Para recuperarlo, presiona Q en la Pantalla y escanea el QR nuevo.");
    }
    if (event.code === 4004) {
      controlKey.clear();
      return finish("Esta sesión ya no existe", "Escanea otra vez el QR de la Pantalla.");
    }
    show("Sin conexión", "Reconectando…");
    setTimeout(connect, Math.min(1000 * 2 ** retries++, 10000));
  });
}

function handle(msg, usedKey) {
  if (msg.type === "hello") {
    if (msg.controlKey) {
      controlKey.set(msg.controlKey);
      pairToken = "";
      history.replaceState(null, "", location.pathname);
    }
    Object.assign(state, {
      title: msg.title ?? state.title,
      kind: msg.kind ?? state.kind,
      index: msg.index ?? 0,
      total: msg.total ?? null,
      slides: msg.slides ?? null,
      deckId: msg.deckId ?? null,
    });
    ready();
    render();
  } else if (msg.type === "slide") {
    if (msg.index > 0) startTimer();
    state.index = msg.index;
    if (Number.isInteger(msg.total)) state.total = msg.total;
    render();
  } else if (msg.type === "ended") {
    finish("La sesión terminó", "Puedes cerrar esta página.");
  } else if (msg.type === "denied") {
    if (usedKey && pairToken) {
      // La llave guardada ya no sirve, pero este celular trae un QR nuevo: se usa ese.
      controlKey.clear();
      return setTimeout(connect, 0);
    }
    controlKey.clear();
    finish(
      msg.reason === "qr" ? "Este QR ya se usó" : "Este celular ya no es el control",
      "Presiona Q en la Pantalla para mostrar un QR nuevo y escanéalo.",
    );
  }
}

// Escanear un QR nuevo con esta página ya abierta solo cambia lo que va después
// del #: el navegador no recarga, así que el Control se empareja de nuevo aquí.
addEventListener("hashchange", () => {
  const token = location.hash.slice(1);
  if (!token) return;
  pairToken = token;
  finished = false;
  retries = 0;
  controlKey.clear();
  const old = socket;
  socket = null;
  old?.close(1000, "");
  show("Conectando…");
  connect();
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-go]");
  if (button) go(button.dataset.go);
});

$("[data-end]").addEventListener("click", () => {
  if (confirm("¿Terminar la sesión? La Pantalla mostrará que terminó.")) send({ type: "end" });
});

show("Conectando…");
connect();
