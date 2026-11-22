import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { MAX_KEYS, ownerOfKey } from "../src/agents/keys";
import { ada, browser } from "./helpers";

const ORIGIN = "https://app.test";
const KEY = /sliding_[A-Za-z0-9]{40}/;
let people = 0;

/** Una persona con sesión, distinta en cada llamada. */
async function person(name = "Ada", lang = "es") {
  people += 1;
  const providerId = `agentes-${people}`;
  const b = browser({ lang, profile: () => ({ ...ada, id: providerId, name }) });
  await b.login();
  const id = (await env.DB.prepare("SELECT id FROM users WHERE provider_id = ?").bind(providerId).first<{ id: string }>())!.id;
  return { b, id };
}

const post = (b: ReturnType<typeof browser>, path: string, fields: Record<string, string> = {}, origin = ORIGIN) => {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  return b.request(path, { method: "POST", body: form, headers: { origin } });
};

/** Crea una Clave para Agentes y devuelve la clave que mostró la página, y su id. */
async function createKey(b: ReturnType<typeof browser>, nombre = "Claude en mi Mac") {
  const response = await post(b, "/panel/agentes", { nombre });
  const html = await response.text();
  const key = KEY.exec(html)?.[0];
  expect(key, "la página muestra la clave nueva").toBeDefined();
  const row = (await env.DB.prepare("SELECT id FROM agent_keys WHERE name = ? ORDER BY created_at DESC").bind(nombre).first<{ id: string }>())!;
  return { response, html, key: key!, id: row.id };
}

const page = async (b: ReturnType<typeof browser>, query = "") => (await b.request(`/panel/agentes${query}`)).text();

describe("las Claves para Agentes (#7)", () => {
  it("son solo del Dueño con sesión, y el panel lleva a ellas", async () => {
    const anonymous = await browser().request("/panel/agentes");
    expect(anonymous.status).toBe(302);
    expect(anonymous.headers.get("location")).toBe("/");

    const { b } = await person();
    expect(await (await b.request("/panel")).text()).toContain('href="/panel/agentes"');
    const html = await page(b);
    expect(html).toContain("<h1>Claves para Agentes</h1>");
    expect(html).toContain("Todavía no tienes claves.");
  });

  it("muestra la clave una sola vez, y guarda solo su hash", async () => {
    const { b, id: ownerId } = await person();
    const { response, html, key, id } = await createKey(b);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(html).toContain("Hazlo ahora: Sliding no vuelve a mostrar la clave.");
    expect(html).toContain(`data-copy="${key}"`);
    // El mensaje para el Agente: el pedido, sus instrucciones y la clave.
    const message = `Publica mi presentación en Sliding.\nInstrucciones para Agentes: ${ORIGIN}/llms.txt\nMi Clave para Agentes: ${key}`;
    expect(html).toContain(`data-copy="${message}"`);

    const row = await env.DB.prepare("SELECT * FROM agent_keys WHERE id = ?").bind(id).first<Record<string, unknown>>();
    expect(row).toMatchObject({ owner_id: ownerId, name: "Claude en mi Mac", last_used_at: null });
    const secret = key.slice("sliding_".length);
    expect(JSON.stringify(row)).not.toContain(secret);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
    expect(row!.hash).toBe([...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join(""));

    const later = await page(b);
    expect(later).toContain("Claude en mi Mac");
    expect(later).toContain("Todavía no se usa");
    expect(later).not.toContain(secret);
  });

  it("cada clave es distinta, aunque tengan el mismo nombre", async () => {
    const { b } = await person();
    const first = await createKey(b, "Repetida");
    const second = await createKey(b, "Repetida");
    expect(first.key).not.toBe(second.key);
  });

  it("dice de qué Dueño es la clave y anota cuándo se usó", async () => {
    const { b, id: ownerId } = await person();
    const { key } = await createKey(b);
    expect(await ownerOfKey(env.DB, key)).toBe(ownerId);
    expect(await page(b)).toMatch(/Usada por última vez el /);

    expect(await ownerOfKey(env.DB, `${key.slice(0, -1)}x`)).toBeNull();
    expect(await ownerOfKey(env.DB, "sliding_corta")).toBeNull();
    expect(await ownerOfKey(env.DB, "")).toBeNull();
    expect(await ownerOfKey(env.DB, null)).toBeNull();
  });

  it("revocar deja la clave sin efecto, y solo su Dueño puede revocarla", async () => {
    const { b } = await person();
    const { key, id } = await createKey(b, "Codex del taller");

    const other = await person("Otra");
    expect(await page(other.b)).not.toContain("Codex del taller");
    const foreign = await post(other.b, `/panel/agentes/${id}/revocar`);
    expect(foreign.headers.get("location")).toBe("/panel/agentes?error=no-existe");
    expect(await ownerOfKey(env.DB, key)).not.toBeNull();

    const revoked = await post(b, `/panel/agentes/${id}/revocar`);
    expect(revoked.status).toBe(303);
    expect(revoked.headers.get("location")).toBe("/panel/agentes?ok=revocada");
    expect(await ownerOfKey(env.DB, key)).toBeNull();
    const html = await page(b, "?ok=revocada");
    expect(html).toContain("Clave revocada.");
    expect(html).not.toContain("Codex del taller");
  });

  it("deja de servir si el Administrador desactiva a su Dueño", async () => {
    const { b, id: ownerId } = await person();
    const { key } = await createKey(b);
    await env.DB.prepare("UPDATE users SET disabled = 1 WHERE id = ?").bind(ownerId).run();
    expect(await ownerOfKey(env.DB, key)).toBeNull();
    await env.DB.prepare("UPDATE users SET disabled = 0 WHERE id = ?").bind(ownerId).run();
    expect(await ownerOfKey(env.DB, key)).toBe(ownerId);
  });

  it("pide un nombre, y no más de las claves que caben", async () => {
    const { b } = await person();
    const empty = await post(b, "/panel/agentes", { nombre: "   " });
    expect(empty.headers.get("location")).toBe("/panel/agentes?error=nombre");
    expect(await page(b, "?error=nombre")).toContain("Escribe un nombre");

    for (let i = 0; i < MAX_KEYS; i += 1) await post(b, "/panel/agentes", { nombre: `Clave ${i}` });
    const extra = await post(b, "/panel/agentes", { nombre: "Una más" });
    expect(extra.headers.get("location")).toBe("/panel/agentes?error=limite");
    expect(await page(b, "?error=limite")).toContain(`${MAX_KEYS} claves`);
  });

  it("no acepta crear ni revocar desde otro origen", async () => {
    const { b } = await person();
    expect((await post(b, "/panel/agentes", { nombre: "Ajena" }, "https://otro.test")).status).toBe(403);
    const { id } = await createKey(b);
    expect((await post(b, `/panel/agentes/${id}/revocar`, {}, "https://otro.test")).status).toBe(403);
  });

  it("habla inglés con quien lo pide", async () => {
    const { b } = await person("Ada", "en");
    const { html } = await createKey(b);
    expect(html).toContain("<h1>Agent keys</h1>");
    expect(html).toContain("Copy message for your agent");
    expect(html).toContain(`Instructions for agents: ${ORIGIN}/llms.txt\nMy agent key: sliding_`);
  });
});
