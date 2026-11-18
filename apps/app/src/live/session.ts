import type { DeckKind, SlideInfo } from "@sliding/core";
import { DurableObject } from "cloudflare:workers";
import { renderSVG } from "uqr";

/** Lo que el Control recibe de cada diapositiva. Nunca llega a la Pantalla. */
async function slidesFor(env: Cloudflare.Env, deckId: string): Promise<SlideInfo[] | null> {
  const stored = await env.DECKS.get<unknown[]>(`notes:${deckId}`, "json");
  if (!Array.isArray(stored)) return null;
  // Las presentaciones subidas antes de guardar títulos tienen solo las notas.
  return stored.map((item) =>
    typeof item === "string" ? { title: "", notes: item } : { title: String((item as SlideInfo).title ?? ""), notes: String((item as SlideInfo).notes ?? "") },
  );
}

/** Una Sesión en vivo sin nadie conectado termina sola a los 30 minutos. */
export const IDLE_MS = 30 * 60 * 1000;

/** Cierres con significado (4000–4999 son de la app): la Pantalla y el Control los muestran. */
export const CLOSE = { ended: 4000, replaced: 4001, denied: 4003, gone: 4004 } as const;

type Role = "screen" | "control";

export interface StartSession {
  sessionId: string;
  deckId: string;
  title: string;
  kind: DeckKind;
  total: number | null;
  /** Origen de la app, para armar la dirección del QR de control. */
  origin: string;
}

interface Meta extends StartSession {
  index: number;
  screenHash: string;
  controlHash: string | null;
  /** El QR de control vigente. Se borra al usarlo: sirve una sola vez. */
  pairToken: string | null;
  ended: boolean;
}

/** 128 bits al azar en base64url. */
export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const isToken = (value: string) => /^[A-Za-z0-9_-]{22}$/.test(value);

async function hash(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const isTarget = (to: unknown) => to === "next" || to === "prev" || (Number.isInteger(to) && (to as number) >= 0 && (to as number) < 10_000);

/**
 * Una Sesión en vivo: une una Pantalla con un Control (ADR 0003). Guarda en
 * qué diapositiva va la presentación y reenvía los comandos entre los dos.
 */
export class LiveSession extends DurableObject<Cloudflare.Env> {
  /** Crea la sesión y devuelve la llave con la que la Pantalla se conecta (y se reconecta). */
  async start(init: StartSession): Promise<{ screenKey: string }> {
    const screenKey = randomToken();
    const meta: Meta = {
      ...init,
      index: 0,
      screenHash: await hash(screenKey),
      controlHash: null,
      pairToken: randomToken(),
      ended: false,
    };
    await this.ctx.storage.put("meta", meta);
    await this.ctx.storage.setAlarm(Date.now() + IDLE_MS);
    return { screenKey };
  }

  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Se espera un WebSocket", { status: 426 });
    }
    const url = new URL(request.url);
    const role: Role | null = url.pathname.endsWith("/screen") ? "screen" : url.pathname.endsWith("/control") ? "control" : null;
    if (!role) return new Response("No encontrado", { status: 404 });

    const { 0: client, 1: server } = new WebSocketPair();
    // Rechazar por WebSocket, y no con un código HTTP, deja que la página explique qué pasó.
    const refuse = (code: number, message: object) => {
      server.accept();
      server.send(JSON.stringify(message));
      server.close(code, "");
      return new Response(null, { status: 101, webSocket: client });
    };

    const meta = await this.meta();
    if (!meta) return refuse(CLOSE.gone, { type: "gone" });
    if (meta.ended) return refuse(CLOSE.ended, { type: "ended" });

    if (role === "screen") {
      if ((await hash(url.searchParams.get("key") ?? "")) !== meta.screenHash) {
        return refuse(CLOSE.denied, { type: "denied", reason: "key" });
      }
      this.closeRole("screen", CLOSE.replaced);
      this.accept(server, "screen");
      server.send(JSON.stringify(this.hello(meta, "screen")));
      if (!meta.controlHash) server.send(JSON.stringify(this.pairMessage(meta)));
    } else {
      const pairToken = url.searchParams.get("pair");
      let controlKey: string | undefined;
      if (pairToken) {
        if (!meta.pairToken || pairToken !== meta.pairToken) return refuse(CLOSE.denied, { type: "denied", reason: "qr" });
        controlKey = randomToken();
        meta.controlHash = await hash(controlKey);
        meta.pairToken = null;
        await this.save(meta);
      } else if (!meta.controlHash || (await hash(url.searchParams.get("key") ?? "")) !== meta.controlHash) {
        return refuse(CLOSE.denied, { type: "denied", reason: "key" });
      }
      this.closeRole("control", CLOSE.replaced);
      this.accept(server, "control");
      const slides = meta.kind === "html-slides" ? await slidesFor(this.env, meta.deckId) : null;
      server.send(
        JSON.stringify({ ...this.hello(meta, "control"), deckId: meta.deckId, slides, ...(controlKey ? { controlKey } : {}) }),
      );
      this.sendRole("screen", { type: "control", connected: true });
    }
    await this.ctx.storage.deleteAlarm();
    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    if (typeof raw !== "string" || raw.length > 2048) return;
    let msg: { type?: unknown; to?: unknown; index?: unknown; total?: unknown };
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    const meta = await this.meta();
    if (!meta || meta.ended) return;
    const { role } = ws.deserializeAttachment() as { role: Role };

    if (role === "control") {
      if (msg.type === "go" && isTarget(msg.to)) this.sendRole("screen", { type: "go", to: msg.to });
      else if (msg.type === "end") await this.end(meta);
      return;
    }
    if (msg.type === "slide" && Number.isInteger(msg.index) && (msg.index as number) >= 0) {
      meta.index = msg.index as number;
      if (Number.isInteger(msg.total) && (msg.total as number) > 0) meta.total = msg.total as number;
      await this.save(meta);
      this.sendRole("control", { type: "slide", index: meta.index, total: meta.total });
    } else if (msg.type === "repair") {
      // Tecla Q en la Pantalla: QR nuevo, y el Control anterior pierde el acceso.
      meta.controlHash = null;
      meta.pairToken = randomToken();
      await this.save(meta);
      this.closeRole("control", CLOSE.replaced);
      ws.send(JSON.stringify(this.pairMessage(meta)));
    }
  }

  override async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    await this.dropped(ws, code);
  }

  override async webSocketError(ws: WebSocket): Promise<void> {
    await this.dropped(ws, 1011);
  }

  override async alarm(): Promise<void> {
    const meta = await this.meta();
    if (meta?.ended || this.ctx.getWebSockets().length === 0) await this.ctx.storage.deleteAll();
  }

  // ── Internos ──────────────────────────────────────────────────────────

  private async meta(): Promise<Meta | undefined> {
    return this.ctx.storage.get<Meta>("meta");
  }

  private async save(meta: Meta): Promise<void> {
    await this.ctx.storage.put("meta", meta);
  }

  private accept(ws: WebSocket, role: Role): void {
    this.ctx.acceptWebSocket(ws, [role]);
    ws.serializeAttachment({ role });
  }

  private hello(meta: Meta, role: Role) {
    return {
      type: "hello",
      role,
      title: meta.title,
      kind: meta.kind,
      index: meta.index,
      total: meta.total,
      paired: meta.controlHash !== null,
      controlConnected: this.ctx.getWebSockets("control").length > 0,
    };
  }

  private pairMessage(meta: Meta) {
    const url = `${meta.origin}/c/${meta.sessionId}#${meta.pairToken}`;
    return { type: "pair", url, svg: renderSVG(url, { border: 2, blackColor: "#111318", whiteColor: "#ffffff" }) };
  }

  private sendRole(role: Role, message: object): void {
    const data = JSON.stringify(message);
    for (const ws of this.ctx.getWebSockets(role)) {
      try {
        ws.send(data);
      } catch {
        // Ya se estaba cerrando.
      }
    }
  }

  private closeRole(role: Role, code: number): void {
    for (const ws of this.ctx.getWebSockets(role)) {
      try {
        ws.close(code, "");
      } catch {
        // Ya estaba cerrado.
      }
    }
  }

  private async end(meta: Meta): Promise<void> {
    meta.ended = true;
    meta.pairToken = null;
    await this.save(meta);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(JSON.stringify({ type: "ended" }));
        ws.close(CLOSE.ended, "");
      } catch {
        // Ya estaba cerrado.
      }
    }
    // Una sesión terminada se recuerda un rato para avisar a quien vuelva, y después se borra.
    await this.ctx.storage.setAlarm(Date.now() + IDLE_MS);
  }

  private async dropped(ws: WebSocket, code: number): Promise<void> {
    try {
      ws.close(code === 1005 || code === 1006 ? 1000 : code, "");
    } catch {
      // Ya estaba cerrado.
    }
    const { role } = (ws.deserializeAttachment() ?? {}) as { role?: Role };
    const open = this.ctx.getWebSockets().filter((other) => other !== ws);
    if (role === "control" && !open.some((other) => this.ctx.getTags(other).includes("control"))) {
      this.sendRole("screen", { type: "control", connected: false });
    }
    if (open.length === 0 && !(await this.ctx.storage.getAlarm())) {
      await this.ctx.storage.setAlarm(Date.now() + IDLE_MS);
    }
  }
}
