// El Control: se une a la Sesión en vivo con el QR de control (una sola vez)
// y después se reconecta con la llave que queda guardada en este celular.

const sessionId = document.body.dataset.session;
const $ = (selector) => document.querySelector(selector);
const title = $("[data-title]");
const count = $("[data-count]");
const main = $("[data-main]");
const foot = $("[data-foot]");
const box = $("[data-state-box]");
const boxTitle = $("[data-state-title]");
const boxText = $("[data-state-text]");

const keyName = `sliding:control:${sessionId}`;
const store = {
  get() {
    try {
      return localStorage.getItem(keyName);
    } catch {
      return null;
    }
  },
  set(value) {
    try {
      localStorage.setItem(keyName, value);
    } catch {}
  },
  clear() {
    try {
      localStorage.removeItem(keyName);
    } catch {}
  },
};

let pairToken = location.hash.slice(1);
let socket = null;
let retries = 0;
let finished = false;

function show(heading, text = "") {
  main.hidden = true;
  foot.hidden = true;
  box.hidden = false;
  boxTitle.textContent = heading;
  boxText.textContent = text;
}

function ready() {
  main.hidden = false;
  foot.hidden = false;
  box.hidden = true;
}

function finish(heading, text) {
  finished = true;
  show(heading, text);
}

function render(msg) {
  if (msg.title) {
    title.textContent = msg.title;
    document.title = `Control · ${msg.title} · Sliding`;
  }
  if (Number.isInteger(msg.index) && Number.isInteger(msg.total)) count.textContent = `${msg.index + 1} / ${msg.total}`;
}

const send = (msg) => {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg));
};

function connect() {
  const key = store.get();
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
      store.clear();
      return finish("Otro celular tomó el control", "Para recuperarlo, presiona Q en la Pantalla y escanea el QR nuevo.");
    }
    if (event.code === 4004) {
      store.clear();
      return finish("Esta sesión ya no existe", "Escanea otra vez el QR de la Pantalla.");
    }
    show("Sin conexión", "Reconectando…");
    setTimeout(connect, Math.min(1000 * 2 ** retries++, 10000));
  });
}

function handle(msg, usedKey) {
  if (msg.type === "hello") {
    if (msg.controlKey) {
      store.set(msg.controlKey);
      pairToken = "";
      history.replaceState(null, "", location.pathname);
    }
    render(msg);
    ready();
  } else if (msg.type === "slide") {
    render(msg);
  } else if (msg.type === "ended") {
    finish("La sesión terminó", "Puedes cerrar esta página.");
  } else if (msg.type === "denied") {
    if (usedKey && pairToken) {
      // La llave guardada ya no sirve, pero este celular trae un QR nuevo: se usa ese.
      store.clear();
      return setTimeout(connect, 0);
    }
    store.clear();
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
  store.clear();
  const old = socket;
  socket = null;
  old?.close(1000, "");
  show("Conectando…");
  connect();
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-go]");
  if (button) send({ type: "go", to: button.dataset.go });
});

$("[data-end]").addEventListener("click", () => {
  if (confirm("¿Terminar la sesión? La Pantalla mostrará que terminó.")) send({ type: "end" });
});

show("Conectando…");
connect();
