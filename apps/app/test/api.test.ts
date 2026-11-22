import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import genericDeck from "../../../fixtures/generic.html?raw";
import htmlSlidesDeck from "../../../fixtures/html-slides.html?raw";
import type { Limits } from "../src/decks/limits";
import { ada, browser } from "./helpers";

const ORIGIN = "https://app.test";
const API = "/api/v1/presentations";
const KEY = /sliding_[A-Za-z0-9]{40}/;
const limits: Limits = { deckBytes: 64 * 1024, bytesPerOwner: 160 * 1024 };
let people = 0;

/** Un Dueño con una Clave para Agentes recién creada. */
async function owner(name = "Ada") {
  people += 1;
  const providerId = `api-${people}`;
  const b = browser({ limits, profile: () => ({ ...ada, id: providerId, name }) });
  await b.login();
  const form = new FormData();
  form.append("nombre", "Claude en mi Mac");
  const html = await (await b.request("/panel/agentes", { method: "POST", body: form, headers: { origin: ORIGIN } })).text();
  const id = (await env.DB.prepare("SELECT id FROM users WHERE provider_id = ?").bind(providerId).first<{ id: string }>())!.id;
  return { b, id, key: KEY.exec(html)![0] };
}

/** Un Agente: como curl, sin cookies ni Origin, solo con la clave. */
const agent = browser({ limits });

function send(method: "POST" | "PUT", path: string, key: string | null, file?: File) {
  const body = new FormData();
  if (file) body.append("file", file);
  const headers: Record<string, string> = key ? { authorization: `Bearer ${key}` } : {};
  return agent.request(path, { method, body, headers });
}

const html = (content: string, name = "index.html") => new File([content], name, { type: "text/html" });
const titled = (title: string) => html(htmlSlidesDeck.replace("<title>Deck de prueba</title>", `<title>${title}</title>`));

type Answer = { id: string; title: string; kind: string; slides: number | null; link: string; presentingLink: string };
type Problem = { error: string; message: string };

describe("la API para Agentes (#8)", () => {
  it("con una clave, sube una presentación nueva y devuelve su id y sus dos enlaces", async () => {
    const { b, key } = await owner();
    const response = await send("POST", API, key, html(htmlSlidesDeck));
    expect(response.status).toBe(201);
    expect(response.headers.get("content-type")).toContain("application/json");
    const deck = (await response.json()) as Answer;
    expect(deck).toMatchObject({ title: "Deck de prueba", kind: "html-slides", slides: 3, link: `${ORIGIN}/d/${deck.id}` });
    expect(deck.presentingLink).toMatch(new RegExp(`^${ORIGIN}/p/[A-Za-z0-9_-]{22}$`));

    // Los dos enlaces funcionan, y la presentación está en el panel de su Dueño.
    expect((await agent.request(new URL(deck.link).pathname)).status).toBe(200);
    expect((await agent.request(new URL(deck.presentingLink).pathname)).status).toBe(200);
    expect(await (await b.request("/panel")).text()).toContain(`href="/d/${deck.id}"`);
  });

  it("con ese id, reemplaza la misma presentación y sus enlaces no cambian", async () => {
    const { key } = await owner();
    const first = (await (await send("POST", API, key, titled("Primera versión"))).json()) as Answer;
    const response = await send("PUT", `${API}/${first.id}`, key, html(genericDeck, "otra.html"));
    expect(response.status).toBe(200);
    const second = (await response.json()) as Answer;
    expect(second).toEqual({ ...first, title: "Deck genérico de prueba", kind: "generic", slides: null });
  });

  it("sin clave, con una clave mala o revocada, o solo con la sesión, no deja hacer nada", async () => {
    const { b, id, key } = await owner();
    for (const bad of [null, `${key.slice(0, -1)}x`, "sliding_corta"]) {
      const response = await send("POST", API, bad, html(htmlSlidesDeck));
      expect(response.status).toBe(401);
      expect(response.headers.get("www-authenticate")).toBe("Bearer");
      const problem = (await response.json()) as Problem;
      expect(problem.error).toBe("unauthorized");
      expect(problem.message).toContain(`${ORIGIN}/panel/agentes`);
    }

    // La cookie de sesión no sirve en la API: solo la clave.
    const form = new FormData();
    form.append("file", html(htmlSlidesDeck));
    expect((await b.request(API, { method: "POST", body: form, headers: { origin: ORIGIN } })).status).toBe(401);

    // Revocada desde el panel, deja de servir.
    const keyId = (await env.DB.prepare("SELECT id FROM agent_keys WHERE owner_id = ?").bind(id).first<{ id: string }>())!.id;
    await b.request(`/panel/agentes/${keyId}/revocar`, { method: "POST", body: new FormData(), headers: { origin: ORIGIN } });
    expect((await send("POST", API, key, html(htmlSlidesDeck))).status).toBe(401);
  });

  it("no reemplaza lo que no es del Dueño de la clave, ni lo que el Administrador desactivó", async () => {
    const ana = await owner("Ana");
    const deck = (await (await send("POST", API, ana.key, titled("De Ana"))).json()) as Answer;
    const other = await owner("Otra");

    for (const path of [`${API}/${deck.id}`, `${API}/abcdefghijkm`, `${API}/no-es-un-id`]) {
      const response = await send("PUT", path, other.key, titled("Pisada"));
      expect(response.status).toBe(404);
      expect(((await response.json()) as Problem).error).toBe("not-found");
    }
    expect((await env.DB.prepare("SELECT title FROM decks WHERE id = ?").bind(deck.id).first<{ title: string }>())!.title).toBe("De Ana");

    await env.DB.prepare("UPDATE decks SET disabled = 1 WHERE id = ?").bind(deck.id).run();
    expect((await send("PUT", `${API}/${deck.id}`, ana.key, titled("Otra vez"))).status).toBe(404);
  });

  it("deja de servir si el Administrador desactiva al Dueño", async () => {
    const { id, key } = await owner();
    await env.DB.prepare("UPDATE users SET disabled = 1 WHERE id = ?").bind(id).run();
    expect((await send("POST", API, key, html(htmlSlidesDeck))).status).toBe(401);
  });

  it("explica cada error con un código y qué hacer", async () => {
    const { key } = await owner();
    const cases: [File | undefined, number, string][] = [
      [undefined, 400, "empty"],
      [new File(["hola"], "notas.txt", { type: "text/plain" }), 415, "format"],
      [new File(["no soy un PDF"], "clase.pdf", { type: "application/pdf" }), 400, "not-pdf"],
      [html(`<title>Grande</title>${"x".repeat(limits.deckBytes)}`), 413, "too-large"],
    ];
    for (const [file, status, error] of cases) {
      const response = await send("POST", API, key, file);
      expect(response.status, error).toBe(status);
      const problem = (await response.json()) as Problem;
      expect(problem.error).toBe(error);
      expect(problem.message.length).toBeGreaterThan(10);
    }

    // El cupo: 160 KB entre todas.
    const big = () => html(`<title>Media</title>${"x".repeat(60 * 1024)}`);
    expect((await send("POST", API, key, big())).status).toBe(201);
    expect((await send("POST", API, key, big())).status).toBe(201);
    const full = await send("POST", API, key, big());
    expect(full.status).toBe(413);
    expect(((await full.json()) as Problem).error).toBe("no-space");
  });

  it("anota cuándo se usó la clave", async () => {
    const { b, key } = await owner();
    await send("POST", API, key, html(htmlSlidesDeck));
    expect(await (await b.request("/panel/agentes")).text()).toMatch(/Usada por última vez el /);
  });

  it("responde JSON también a lo que no existe", async () => {
    const { key } = await owner();
    const response = await agent.request(`${API}/abcdefghijkm/otra-cosa`, { headers: { authorization: `Bearer ${key}` } });
    expect(response.status).toBe(404);
    expect(((await response.json()) as Problem).error).toBe("not-found");
  });
});

describe("/llms.txt (#8)", () => {
  it("le explica a un Agente, en inglés y con curl, cómo subir y reemplazar", async () => {
    const response = await browser({ lang: "es", limits }).request("/llms.txt");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    const text = await response.text();
    expect(text).toMatch(/^# Sliding\n/);
    for (const part of [
      `curl -sS -X POST "${ORIGIN}${API}"`,
      `curl -sS -X PUT "${ORIGIN}${API}/<id>"`,
      '-H "Authorization: Bearer $SLIDING_KEY"',
      '-F "file=@index.html"',
      ".sliding.json",
      `${ORIGIN}/panel/agentes`,
      "presentingLink",
      "not-found",
      "64 KB",
    ]) {
      expect(text, part).toContain(part);
    }
    expect(text).not.toMatch(/presentación|diapositiva/);
  });

  it("la página de las claves lleva a /llms.txt", async () => {
    const { b } = await owner();
    expect(await (await b.request("/panel/agentes")).text()).toContain(`<a href="${ORIGIN}/llms.txt">${ORIGIN}/llms.txt</a>`);
  });
});
