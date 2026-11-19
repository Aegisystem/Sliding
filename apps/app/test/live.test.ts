import { runDurableObjectAlarm } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import { newDeckId } from "@sliding/core";
import { describe, expect, it } from "vitest";
import { newPresentSecret } from "../src/decks/store";

const ORIGIN = "https://app.test";
const app = (path: string, init?: RequestInit) => exports.default.fetch(`${ORIGIN}${path}`, init);

type Msg = Record<string, unknown> & { type: string };

async function presentable({ kind = "html-slides", total = 3, notes }: { kind?: string; total?: number; notes?: unknown } = {}) {
  const id = newDeckId();
  if (notes !== undefined) await env.DECKS.put(`notes:${id}`, JSON.stringify(notes));
  const secret = newPresentSecret();
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO decks (id, title, kind, size, slide_count, present_secret, disabled, created_at, updated_at)
     VALUES (?, 'Charla', ?, 1, ?, ?, 0, ?, ?)`,
  )
    .bind(id, kind, kind === "html-slides" ? total : null, secret, now, now)
    .run();
  return { id, secret };
}

async function newSession(secret: string) {
  const response = await app(`/p/${secret}/sesion`, { method: "POST", headers: { origin: ORIGIN } });
  expect(response.status).toBe(200);
  return response.json<{ sessionId: string; screenKey: string }>();
}

/** Un WebSocket de prueba: guarda lo que llega y deja esperar un tipo de mensaje o el cierre. */
async function socket(path: string) {
  const response = await app(path, { headers: { upgrade: "websocket", origin: ORIGIN } });
  const ws = response.webSocket;
  if (!ws) throw new Error(`Sin WebSocket: ${response.status}`);
  const inbox: Msg[] = [];
  const waiters: { type: string; resolve: (m: Msg) => void }[] = [];
  let onClose: (code: number) => void = () => {};
  const closed = new Promise<number>((resolve) => (onClose = resolve));
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data as string) as Msg;
    const waiter = waiters.findIndex((w) => w.type === msg.type);
    if (waiter >= 0) waiters.splice(waiter, 1)[0]!.resolve(msg);
    else inbox.push(msg);
  });
  ws.addEventListener("close", (event) => onClose(event.code));
  ws.accept();
  return {
    closed,
    send: (msg: object) => ws.send(JSON.stringify(msg)),
    close: () => ws.close(1000, ""),
    next(type: string): Promise<Msg> {
      const found = inbox.findIndex((m) => m.type === type);
      if (found >= 0) return Promise.resolve(inbox.splice(found, 1)[0]!);
      return new Promise((resolve, reject) => {
        waiters.push({ type, resolve });
        setTimeout(() => reject(new Error(`No llegó «${type}»`)), 3000);
      });
    },
  };
}

/** Una Sesión en vivo con la Pantalla conectada y su QR de control a mano. */
async function screenReady() {
  const { secret } = await presentable();
  const { sessionId, screenKey } = await newSession(secret);
  const screen = await socket(`/live/${sessionId}/screen?key=${screenKey}`);
  const hello = await screen.next("hello");
  const pair = await screen.next("pair");
  const token = new URL(pair.url as string).hash.slice(1);
  return { sessionId, screenKey, screen, hello, pair, token };
}

async function pairedControl() {
  const ready = await screenReady();
  const control = await socket(`/live/${ready.sessionId}/control?pair=${ready.token}`);
  const hello = await control.next("hello");
  await ready.screen.next("control");
  return { ...ready, control, controlKey: hello.controlKey as string };
}

describe("abrir una Sesión en vivo", () => {
  it("solo con un Enlace para presentar válido", async () => {
    expect((await app("/p/AAAAAAAAAAAAAAAAAAAAAA/sesion", { method: "POST", headers: { origin: ORIGIN } })).status).toBe(404);
    const { secret } = await presentable();
    const { sessionId, screenKey } = await newSession(secret);
    expect(sessionId).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(screenKey).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  it("la Pantalla recibe el estado y el QR de control", async () => {
    const { sessionId, hello, pair } = await screenReady();
    expect(hello).toMatchObject({ role: "screen", paired: false, title: "Charla", kind: "html-slides", total: 3, index: 0 });
    expect(pair.url).toMatch(new RegExp(`^${ORIGIN}/c/${sessionId}#[A-Za-z0-9_-]{22}$`));
    expect(pair.svg).toMatch(/^<svg/);
  });

  it("rechaza una Pantalla con la llave equivocada", async () => {
    const { secret } = await presentable();
    const { sessionId } = await newSession(secret);
    const screen = await socket(`/live/${sessionId}/screen?key=equivocada`);
    expect(await screen.next("denied")).toMatchObject({ reason: "key" });
    expect(await screen.closed).toBe(4003);
  });
});

describe("el QR de control", () => {
  it("convierte en Control al primer celular que lo escanea, y deja de servir", async () => {
    const { sessionId, token, screen } = await screenReady();
    const control = await socket(`/live/${sessionId}/control?pair=${token}`);
    const hello = await control.next("hello");
    expect(hello).toMatchObject({ role: "control", title: "Charla", total: 3 });
    expect(hello.controlKey).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(await screen.next("control")).toMatchObject({ connected: true });

    const second = await socket(`/live/${sessionId}/control?pair=${token}`);
    expect(await second.next("denied")).toMatchObject({ reason: "qr" });
    expect(await second.closed).toBe(4003);
  });

  it("con Q se cambia por uno nuevo y el Control anterior queda fuera", async () => {
    const { sessionId, screen, control, controlKey, token } = await pairedControl();
    screen.send({ type: "repair" });
    expect(await control.closed).toBe(4001);
    const pair = await screen.next("pair");
    expect(new URL(pair.url as string).hash.slice(1)).not.toBe(token);

    const old = await socket(`/live/${sessionId}/control?key=${controlKey}`);
    expect(await old.next("denied")).toMatchObject({ reason: "key" });
  });
});

describe("las Notas del presentador", () => {
  const slides = [
    { title: "Hola", notes: "Saluda." },
    { title: "Idea", notes: "Explica la idea." },
  ];

  it("llegan al Control con el título de cada diapositiva, y nunca a la Pantalla", async () => {
    const { id, secret } = await presentable({ total: 2, notes: slides });
    const { sessionId, screenKey } = await newSession(secret);
    const screen = await socket(`/live/${sessionId}/screen?key=${screenKey}`);
    const screenHello = await screen.next("hello");
    expect(screenHello).not.toHaveProperty("slides");
    expect(JSON.stringify(screenHello)).not.toContain("Saluda");
    const pair = await screen.next("pair");

    const control = await socket(`/live/${sessionId}/control?pair=${new URL(pair.url as string).hash.slice(1)}`);
    expect(await control.next("hello")).toMatchObject({ deckId: id, slides });
  });

  it("también se leen las notas guardadas antes de que hubiera títulos", async () => {
    const { secret } = await presentable({ total: 2, notes: ["Saluda.", "Explica la idea."] });
    const { sessionId, screenKey } = await newSession(secret);
    const screen = await socket(`/live/${sessionId}/screen?key=${screenKey}`);
    await screen.next("hello");
    const pair = await screen.next("pair");
    const control = await socket(`/live/${sessionId}/control?pair=${new URL(pair.url as string).hash.slice(1)}`);
    expect(await control.next("hello")).toMatchObject({
      slides: [
        { title: "", notes: "Saluda." },
        { title: "", notes: "Explica la idea." },
      ],
    });
  });

  it("una Presentación en PDF manda las notas de su .pptx, y nada si no las tiene", async () => {
    for (const [notes, expected] of [
      [slides, slides],
      [undefined, null],
    ] as const) {
      const { secret } = await presentable({ kind: "pdf", ...(notes ? { notes } : {}) });
      const { sessionId, screenKey } = await newSession(secret);
      const screen = await socket(`/live/${sessionId}/screen?key=${screenKey}`);
      expect(JSON.stringify(await screen.next("hello"))).not.toContain("Saluda");
      const pair = await screen.next("pair");
      const control = await socket(`/live/${sessionId}/control?pair=${new URL(pair.url as string).hash.slice(1)}`);
      expect(await control.next("hello")).toMatchObject({ kind: "pdf", slides: expected });
    }
  });

  it("una Presentación genérica no manda notas", async () => {
    const { secret } = await presentable({ kind: "generic" });
    const { sessionId, screenKey } = await newSession(secret);
    const screen = await socket(`/live/${sessionId}/screen?key=${screenKey}`);
    await screen.next("hello");
    const pair = await screen.next("pair");
    const control = await socket(`/live/${sessionId}/control?pair=${new URL(pair.url as string).hash.slice(1)}`);
    expect(await control.next("hello")).toMatchObject({ kind: "generic", slides: null });
  });
});

describe("durante la presentación", () => {
  it("el Control mueve la presentación", async () => {
    const { screen, control } = await pairedControl();
    control.send({ type: "go", to: "next" });
    expect(await screen.next("go")).toMatchObject({ to: "next" });
    control.send({ type: "go", to: "nada" });
    control.send({ type: "go", to: 2 });
    expect(await screen.next("go")).toMatchObject({ to: 2 });
  });

  it("el Control sabe en qué diapositiva va la Pantalla", async () => {
    const { screen, control } = await pairedControl();
    screen.send({ type: "slide", index: 1, total: 3 });
    expect(await control.next("slide")).toMatchObject({ index: 1, total: 3 });
  });

  it("el Control vuelve con su llave, sin escanear otra vez", async () => {
    const { sessionId, screen, control, controlKey } = await pairedControl();
    control.close();
    expect(await screen.next("control")).toMatchObject({ connected: false });
    const again = await socket(`/live/${sessionId}/control?key=${controlKey}`);
    const hello = await again.next("hello");
    expect(hello.controlKey).toBeUndefined();
    expect(await screen.next("control")).toMatchObject({ connected: true });
  });

  it("la Pantalla vuelve con su llave y ya no muestra QR", async () => {
    const { sessionId, screenKey, screen } = await pairedControl();
    screen.close();
    const again = await socket(`/live/${sessionId}/screen?key=${screenKey}`);
    expect(await again.next("hello")).toMatchObject({ paired: true, controlConnected: true });
  });
});

describe("el final de la sesión", () => {
  it("Terminar cierra la sesión para todos", async () => {
    const { sessionId, screenKey, screen, control } = await pairedControl();
    control.send({ type: "end" });
    await screen.next("ended");
    expect(await screen.closed).toBe(4000);
    expect(await control.closed).toBe(4000);
    const late = await socket(`/live/${sessionId}/screen?key=${screenKey}`);
    await late.next("ended");
  });

  it("sin nadie conectado, la sesión se borra sola", async () => {
    const { secret } = await presentable();
    const { sessionId, screenKey } = await newSession(secret);
    expect(await runDurableObjectAlarm(env.LIVE.get(env.LIVE.idFromName(sessionId)))).toBe(true);
    const screen = await socket(`/live/${sessionId}/screen?key=${screenKey}`);
    await screen.next("gone");
    expect(await screen.closed).toBe(4004);
  });
});

describe("las rutas", () => {
  it("los WebSockets solo aceptan el origen de la app", async () => {
    const { secret } = await presentable();
    const { sessionId, screenKey } = await newSession(secret);
    const path = `/live/${sessionId}/screen?key=${screenKey}`;
    expect((await app(path, { headers: { upgrade: "websocket", origin: "https://decks.sliding.workers.dev" } })).status).toBe(403);
    expect((await app(path)).status).toBe(426);
    expect((await app(`/live/corto/screen`, { headers: { upgrade: "websocket", origin: ORIGIN } })).status).toBe(404);
  });

  it("el Enlace para presentar abre la Pantalla con la presentación del otro origen", async () => {
    const { id, secret } = await presentable();
    const response = await app(`/p/${secret}`);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain(`src="${env.DECKS_ORIGIN}/v/${id}"`);
    expect(html).toContain(`data-secret="${secret}"`);
    expect(html).toContain("Este QR es el control de tus diapositivas. No lo compartas.");
    expect(html).toContain("Esta es la Pantalla, lo que ve el público.");
    expect((await app("/p/AAAAAAAAAAAAAAAAAAAAAA")).status).toBe(404);
  });

  it("el QR lleva a la página del Control", async () => {
    const { sessionId } = await screenReady();
    const response = await app(`/c/${sessionId}`);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain(`data-session="${sessionId}"`);
    expect((await app("/c/corto")).status).toBe(404);
  });
});
