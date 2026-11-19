// El visor de una Presentación en PDF (ADR 0004). Dibuja cada página con
// pdf.js y habla con la Pantalla igual que el puente de las presentaciones HTML:
//   recibe  { sliding: 1, type: "go", to: "next" | "prev" | n }  y  { sliding: 1, type: "hello" }
//   envía   { sliding: 1, type: "slide", index, total }  y  { sliding: 1, type: "key", key: "q" }

const { pdf: PDF_URL, size: SIZE, app: APP, pdfjs: PDFJS } = document.body.dataset;
const stage = document.querySelector("[data-stage]");
const status = document.querySelector("[data-status]");
const live = document.querySelector("[data-live]");
const embedded = window.parent !== window;
// La vista previa del Control es una miniatura: no necesita todos los píxeles de la pantalla.
const preview = new URLSearchParams(location.search).has("previa");
// Un proyector 4K como mucho: más que eso solo gasta memoria (y en iPhone, rompe el canvas).
const MAX_PIXELS = 3840 * 2160;

const post = (message) => {
  if (embedded) window.parent.postMessage({ sliding: 1, ...message }, APP);
};

let doc = null;
let total = 0;
// `#5` abre la diapositiva 5, como en html-slides.
let index = Math.max(0, (Number.parseInt(location.hash.slice(1), 10) || 1) - 1);
let shown = -1;

const clamp = (i) => Math.min(Math.max(0, i), Math.max(0, total - 1));
const report = () => {
  if (doc) post({ type: "slide", index, total });
};

// ── Descarga, con avance ──────────────────────────────────────────────────

async function download() {
  const response = await fetch(PDF_URL);
  if (!response.ok || !response.body) throw new Error(`El PDF respondió ${response.status}`);
  const size = Number(SIZE) || 0;
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (size) status.textContent = `Cargando la presentación… ${Math.min(99, Math.floor((received / size) * 100))} %`;
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

// ── Dibujar: la actual, más la anterior y la siguiente ya listas ──────────

/** Canvas ya dibujados, por diapositiva, para el tamaño de ventana actual. */
const cache = new Map();
const drawing = new Map();
const sizeKey = () => `${innerWidth}x${innerHeight}@${preview ? 1 : devicePixelRatio}`;

function sizing(page) {
  const base = page.getViewport({ scale: 1 });
  const fit = Math.min(innerWidth / base.width, innerHeight / base.height);
  let scale = fit * (preview ? 1 : devicePixelRatio || 1);
  const pixels = base.width * base.height * scale * scale;
  if (pixels > MAX_PIXELS) scale *= Math.sqrt(MAX_PIXELS / pixels);
  return { viewport: page.getViewport({ scale }), width: base.width * fit, height: base.height * fit };
}

function draw(i) {
  const key = sizeKey();
  const done = cache.get(i);
  if (done?.key === key) return Promise.resolve(done.canvas);
  const running = drawing.get(i);
  if (running?.key === key) return running.promise;
  const promise = (async () => {
    const page = await doc.getPage(i + 1);
    const { viewport, width, height } = sizing(page);
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.setAttribute("role", "img");
    await page.render({ canvas, viewport }).promise;
    if (sizeKey() !== key) return draw(i);
    cache.set(i, { key, canvas });
    trim();
    return canvas;
  })();
  drawing.set(i, { key, promise });
  promise.finally(() => {
    if (drawing.get(i)?.promise === promise) drawing.delete(i);
  });
  return promise;
}

/** Suelta la memoria de los canvas que ya no están cerca. */
function trim() {
  for (const [i, { canvas }] of cache) {
    if (i === shown || Math.abs(i - index) <= 1) continue;
    canvas.width = canvas.height = 0;
    cache.delete(i);
  }
}

async function show(i) {
  index = clamp(i);
  report();
  if (!embedded) history.replaceState(null, "", `#${index + 1}`);
  const want = index;
  const canvas = await draw(want).catch((error) => {
    console.error(error);
    return null;
  });
  if (!canvas || want !== index) return;
  canvas.setAttribute("aria-label", `Diapositiva ${want + 1} de ${total}`);
  stage.replaceChildren(canvas);
  shown = want;
  live.textContent = `Diapositiva ${want + 1} de ${total}`;
  trim();
  // Las vecinas, después: así avanzar o volver no espera a pdf.js.
  if (want + 1 < total) await draw(want + 1).catch(() => {});
  if (want > 0 && !preview) await draw(want - 1).catch(() => {});
}

function go(to) {
  if (Number.isInteger(to)) {
    if (doc) show(to);
    else index = Math.max(0, to);
  } else if (to === "next" || to === "prev") {
    const step = to === "next" ? 1 : -1;
    if (doc) show(index + step);
    else index = Math.max(0, index + step);
  }
}

// ── La Pantalla, el teclado, el mouse y el dedo ───────────────────────────

addEventListener("message", (event) => {
  if (event.origin !== APP || event.source !== window.parent || !event.data || event.data.sliding !== 1) return;
  if (event.data.type === "go") go(event.data.to);
  else if (event.data.type === "hello") report();
});

const NEXT = new Set(["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"]);
const PREV = new Set(["ArrowLeft", "ArrowUp", "PageUp", "Backspace"]);

function fullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}

addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const { key } = event;
  if (key === "q" || key === "Q") {
    // Q en la Pantalla pide un QR de control nuevo: solo si la tecla la apretó una persona.
    if (event.isTrusted) post({ type: "key", key: "q" });
  } else if (key === "f" || key === "F") fullscreen();
  else if (NEXT.has(key)) go("next");
  else if (PREV.has(key)) go("prev");
  else if (key === "Home") go(0);
  else if (key === "End") go(Math.max(0, total - 1));
  else return;
  event.preventDefault();
});

// Un clic avanza; deslizar a la izquierda o a la derecha avanza o vuelve.
let swipe = null;
let swiped = false;
addEventListener("pointerdown", (event) => {
  swiped = false;
  swipe = event.pointerType === "mouse" ? null : { x: event.clientX, y: event.clientY };
});
addEventListener("pointerup", (event) => {
  if (!swipe) return;
  const dx = event.clientX - swipe.x;
  const dy = event.clientY - swipe.y;
  swipe = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    swiped = true;
    go(dx < 0 ? "next" : "prev");
  }
});
addEventListener("click", (event) => {
  if (swiped) {
    swiped = false;
    return;
  }
  if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) go("next");
});

// Al cambiar el tamaño (pantalla completa, otro monitor), se dibuja otra vez.
let resizeTimer;
addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (doc) show(index);
  }, 150);
});

// ── Abrir el PDF ──────────────────────────────────────────────────────────

try {
  const [pdfjs, data] = await Promise.all([import(`${PDFJS}pdf.min.mjs`), download()]);
  pdfjs.GlobalWorkerOptions.workerSrc = `${PDFJS}pdf.worker.min.mjs`;
  doc = await pdfjs.getDocument({
    data,
    cMapUrl: `${PDFJS}cmaps/`,
    standardFontDataUrl: `${PDFJS}standard_fonts/`,
    wasmUrl: `${PDFJS}wasm/`,
    iccUrl: `${PDFJS}iccs/`,
  }).promise;
  total = doc.numPages;
  status.hidden = true;
  await show(index);
} catch (error) {
  console.error(error);
  status.textContent = "No se pudo abrir esta presentación. Recarga la página para intentarlo otra vez.";
}
