// La Pantalla: crea (o retoma) la Sesión en vivo, muestra el QR de control y
// reenvía los comandos del Control a la presentación, que vive en otro origen.

// Los textos de la página, en el idioma de quien mira (#10): los pone el servidor.
const T = JSON.parse(document.getElementById("textos")?.textContent || "{}");
const say = (key, values = {}) => (T[key] ?? key).replace(/\{(\w+)\}/g, (hole, k) => (k in values ? String(values[k]) : hole));

const body = document.body;
const secret = body.dataset.secret;
const decksOrigin = body.dataset.decksOrigin;
const frame = document.querySelector(".screen-deck");
const prep = document.querySelector(".prep");
const qr = prep.querySelector("[data-qr]");
const message = prep.querySelector("[data-message]");
const messageText = prep.querySelector("[data-message-text]");
const restart = prep.querySelector("[data-restart]");
const toastBox = document.querySelector("[data-toast]");

// La sesión se recuerda por pestaña: recargar la Pantalla retoma la misma, sin QR nuevo.
const storeKey = `sliding:pantalla:${secret}`;
const store = {
  get() {
    try {
      return JSON.parse(sessionStorage.getItem(storeKey));
    } catch {
      return null;
    }
  },
  set(value) {
    try {
      sessionStorage.setItem(storeKey, JSON.stringify(value));
    } catch {}
  },
  clear() {
    try {
      sessionStorage.removeItem(storeKey);
    } catch {}
  },
};

let session = null;
let socket = null;
let retries = 0;
let paired = false;
let toastTimer;

function setState(state, text) {
  prep.dataset.state = state;
  const showsMessage = state === "ended" || state === "error";
  message.hidden = !showsMessage;
  restart.hidden = state !== "ended";
  if (text !== undefined) messageText.textContent = text;
  if (state === "paired") frame.focus();
}

function toast(text) {
  toastBox.textContent = text;
  toastBox.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastBox.classList.remove("is-visible"), 4000);
}

const toDeck = (msg) => frame.contentWindow?.postMessage({ sliding: 1, ...msg }, decksOrigin);
const send = (msg) => {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg));
};

async function start() {
  session = store.get();
  if (!session) {
    const response = await fetch(`/p/${secret}/sesion`, { method: "POST" }).catch(() => null);
    if (!response?.ok) {
      setState("error", say("screenOpenFailed"));
      return;
    }
    session = await response.json();
    store.set(session);
  }
  connect();
}

function connect() {
  const scheme = location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(
    `${scheme}//${location.host}/live/${session.sessionId}/screen?key=${encodeURIComponent(session.screenKey)}`,
  );
  socket.addEventListener("open", () => {
    retries = 0;
  });
  socket.addEventListener("message", (event) => {
    try {
      handle(JSON.parse(event.data));
    } catch {}
  });
  socket.addEventListener("close", (event) => {
    if (event.code === 4000) return setState("ended", say("screenEnded"));
    if (event.code === 4001) return setState("error", say("screenOtherTab"));
    if (event.code === 4003 || event.code === 4004) {
      // La sesión ya no existe (o venció): se abre una nueva con su QR.
      store.clear();
      return start();
    }
    if (paired) toast(say("screenOffline"));
    setTimeout(connect, Math.min(1000 * 2 ** retries++, 10000));
  });
}

function handle(msg) {
  if (msg.type === "hello") {
    paired = msg.paired;
    setState(paired ? "paired" : "pairing");
    toDeck({ type: "hello" });
  } else if (msg.type === "pair") {
    qr.innerHTML = msg.svg;
    qr.dataset.url = msg.url;
    paired = false;
    setState("pairing");
  } else if (msg.type === "control") {
    if (msg.connected) {
      paired = true;
      setState("paired");
      toast(say("controlConnected"));
    } else {
      toast(say("controlLeft"));
    }
  } else if (msg.type === "go") {
    toDeck({ type: "go", to: msg.to });
  } else if (msg.type === "ended") {
    setState("ended", say("screenEnded"));
  }
}

function repair() {
  if (prep.dataset.state === "ended" || prep.dataset.state === "error") return;
  send({ type: "repair" });
  toast(say("newQrDone"));
}

function fullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}

// Lo que avisa la presentación: en qué diapositiva va y la tecla Q.
addEventListener("message", (event) => {
  if (event.origin !== decksOrigin || event.source !== frame.contentWindow) return;
  const data = event.data;
  if (!data || data.sliding !== 1) return;
  if (data.type === "slide") send({ type: "slide", index: data.index, total: data.total });
  else if (data.type === "key" && data.key === "q") repair();
});

// Con el foco en la Pantalla (no en la presentación), las teclas igual mueven la presentación.
const NEXT = new Set(["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"]);
const PREV = new Set(["ArrowLeft", "ArrowUp", "PageUp", "Backspace"]);
addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target.closest?.("button")) return;
  if (event.key === "q" || event.key === "Q") repair();
  else if (event.key === "f" || event.key === "F") fullscreen();
  else if (prep.dataset.state === "paired" && NEXT.has(event.key)) toDeck({ type: "go", to: "next" });
  else if (prep.dataset.state === "paired" && PREV.has(event.key)) toDeck({ type: "go", to: "prev" });
});

document.querySelector("[data-fullscreen]").addEventListener("click", fullscreen);

// Abierta en un celular no tiene sentido mostrar un QR: se explica y se ofrece mandarla al computador.
const isPhone = matchMedia("(hover: none) and (pointer: coarse)").matches && Math.min(screen.width, screen.height) <= 600;

document.querySelector("[data-share]").addEventListener("click", async () => {
  if (navigator.share) {
    await navigator.share({ title: document.title, url: location.href }).catch(() => {});
    return;
  }
  try {
    await navigator.clipboard.writeText(location.href);
    toast(say("linkCopied"));
  } catch {
    toast(say("linkCopyFailed"));
  }
});
document.querySelector("[data-here]").addEventListener("click", () => setState("here"));
restart.addEventListener("click", () => {
  store.clear();
  location.reload();
});
frame.addEventListener("load", () => toDeck({ type: "hello" }));

if (isPhone) setState("phone");
else start();
