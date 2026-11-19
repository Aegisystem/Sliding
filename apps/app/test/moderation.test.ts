import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import genericDeck from "../../../fixtures/generic.html?raw";
import { resolveLink } from "../src/moderation/store";
import { ada, browser } from "./helpers";

const ORIGIN = "https://app.test";
let people = 0;
const vars = { ADMIN_USER_IDS: "" };

/** Una persona con sesión. Todas leen el mismo ADMIN_USER_IDS, que el test cambia. */
async function person(name: string) {
  people += 1;
  const providerId = `mod-${people}`;
  const b = browser({ vars, profile: () => ({ ...ada, id: providerId, name }) });
  await b.login();
  const id = (await env.DB.prepare("SELECT id FROM users WHERE provider_id = ?").bind(providerId).first<{ id: string }>())!.id;
  return { b, id };
}

async function admin() {
  const a = await person(`Admin ${people + 1}`);
  vars.ADMIN_USER_IDS = `otro-id, ${a.id}`;
  return a;
}

async function upload(b: ReturnType<typeof browser>, title: string, folder?: string) {
  const form = new FormData();
  form.append("file", new File([`<title>${title}</title>${genericDeck}`], "x.html", { type: "text/html" }));
  if (folder) form.append("carpeta", folder);
  await b.request("/panel/decks", { method: "POST", body: form, headers: { origin: ORIGIN } });
  return (await env.DB.prepare("SELECT id, present_secret AS secret FROM decks WHERE title = ?").bind(title).first<{ id: string; secret: string }>())!;
}

const post = (b: ReturnType<typeof browser>, path: string, fields: Record<string, string> = {}) => {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  return b.request(path, { method: "POST", body: form, headers: { origin: ORIGIN } });
};

// El Worker de las presentaciones vive aparte; aquí basta con sus dos caminos en la app.
const app = (path: string) => exports.default.fetch(`${ORIGIN}${path}`, { headers: { "accept-language": "es" } });

describe("la página de moderación", () => {
  it("sin administrador, a quien entra le muestra su id para copiarlo", async () => {
    vars.ADMIN_USER_IDS = "";
    const { b, id } = await person("Primera");
    const html = await (await b.request("/moderacion")).text();
    expect(html).toContain("Sliding todavía no tiene administrador.");
    expect(html).toContain(`<code class="mod-id">${id}</code>`);
    // Pero no deja hacer nada.
    expect((await post(b, `/moderacion/duenos/${id}/desactivar`)).status).toBe(404);
  });

  it("para quien no es administrador no existe, ni sin sesión", async () => {
    await admin();
    const { b } = await person("Curiosa");
    expect((await b.request("/moderacion")).status).toBe(404);
    expect((await browser({ vars }).request("/moderacion")).status).toBe(404);
    expect((await post(b, "/moderacion/presentaciones/abcdefghijkm/desactivar")).status).toBe(404);
  });

  it("el administrador ve las subidas recientes y los Dueños", async () => {
    const { b: owner } = await person("Dueña Reciente");
    await upload(owner, "Charla reciente");
    const { b } = await admin();
    const html = await (await b.request("/moderacion")).text();
    expect(html).toContain("Subidas recientes");
    expect(html).toContain("Charla reciente");
    expect(html).toContain("Dueña Reciente");
    expect(html).toContain("Tu cuenta.");
  });
});

describe("desactivar una presentación", () => {
  it("da 404 en su enlace y en su Enlace para presentar, y su Dueño la ve marcada", async () => {
    const { b: owner } = await person("Dueño de la charla");
    const deck = await upload(owner, "Charla dudosa");
    const { b } = await admin();

    const response = await post(b, `/moderacion/presentaciones/${deck.id}/desactivar`, { enlace: `${ORIGIN}/d/${deck.id}` });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`/moderacion?enlace=${encodeURIComponent(`${ORIGIN}/d/${deck.id}`)}&ok=presentacion-desactivar`);

    expect((await app(`/d/${deck.id}`)).status).toBe(404);
    expect((await app(`/p/${deck.secret}`)).status).toBe(404);
    const panel = await (await owner.request("/panel")).text();
    expect(panel).toContain("<strong>Desactivada.</strong>");
    expect(panel).not.toContain(`href="/p/${deck.secret}"`);

    await post(b, `/moderacion/presentaciones/${deck.id}/reactivar`);
    expect((await app(`/d/${deck.id}`)).status).toBe(200);
    expect((await app(`/p/${deck.secret}`)).status).toBe(200);
  });

  it("pide el origen de la app", async () => {
    const { b: owner } = await person("Dueña con origen");
    const deck = await upload(owner, "Charla con origen");
    const { b } = await admin();
    const form = new FormData();
    const response = await b.request(`/moderacion/presentaciones/${deck.id}/desactivar`, {
      method: "POST",
      body: form,
      headers: { origin: "https://decks.sliding.workers.dev" },
    });
    expect(response.status).toBe(403);
    expect((await app(`/d/${deck.id}`)).status).toBe(200);
  });
});

describe("desactivar un Dueño", () => {
  it("no puede entrar ni subir, y su presentación y su carpeta dan 404 hasta reactivarlo", async () => {
    const { b: owner, id } = await person("Dueño que abusa");
    await post(owner, "/panel/carpetas", { nombre: "Curso" });
    const folder = (await env.DB.prepare("SELECT id FROM folders WHERE owner_id = ?").bind(id).first<{ id: string }>())!.id;
    const deck = await upload(owner, "Página falsa", folder);
    const { b } = await admin();

    expect((await post(b, `/moderacion/duenos/${id}/desactivar`)).headers.get("location")).toBe("/moderacion?ok=dueno-desactivar");
    expect((await app(`/d/${deck.id}`)).status).toBe(404);
    expect((await app(`/p/${deck.secret}`)).status).toBe(404);
    expect((await app(`/f/${folder}`)).status).toBe(404);
    // La sesión que tenía ya no sirve, y no puede volver a entrar.
    expect((await owner.request("/panel")).status).toBe(302);
    expect((await owner.login()).headers.get("location")).toBe("/?error=disabled");

    await post(b, `/moderacion/duenos/${id}/reactivar`);
    expect((await app(`/d/${deck.id}`)).status).toBe(200);
    expect((await app(`/f/${folder}`)).status).toBe(200);
  });

  it("el administrador no puede desactivar su propia cuenta", async () => {
    const { b, id } = await admin();
    expect((await post(b, `/moderacion/duenos/${id}/desactivar`)).headers.get("location")).toBe("/moderacion?error=propia");
    expect((await b.request("/moderacion")).status).toBe(200);
  });
});

describe("pegar un enlace", () => {
  it("encuentra la presentación por cualquiera de sus enlaces, y su Dueño", async () => {
    const { b: owner, id } = await person("Dueña buscada");
    const deck = await upload(owner, "Charla buscada");
    for (const link of [
      `${ORIGIN}/d/${deck.id}`,
      `https://decks.sliding.workers.dev/v/${deck.id}`,
      `https://decks.sliding.workers.dev/v/${deck.id}/pdf?v=1`,
      `${ORIGIN}/p/${deck.secret}`,
      `  ${deck.id}  `,
    ]) {
      const found = await resolveLink(env.DB, link);
      expect(found.type, link).toBe("deck");
      if (found.type === "deck") {
        expect(found.deck.id).toBe(deck.id);
        expect(found.owner?.id).toBe(id);
      }
    }
    const { b } = await admin();
    const html = await (await b.request(`/moderacion?enlace=${encodeURIComponent(`${ORIGIN}/p/${deck.secret}`)}`)).text();
    expect(html).toContain("La presentación");
    expect(html).toContain("Dueña buscada");
    // El formulario recuerda lo que se buscó, para volver ahí después de desactivar.
    expect(html).toContain(`name="enlace" value="${ORIGIN}/p/${deck.secret}"`);
  });

  it("encuentra una carpeta, y explica los enlaces que no llevan a nada", async () => {
    const { b: owner, id } = await person("Dueño de carpeta");
    await post(owner, "/panel/carpetas", { nombre: "Biología" });
    const folder = (await env.DB.prepare("SELECT id FROM folders WHERE owner_id = ?").bind(id).first<{ id: string }>())!.id;
    expect(await resolveLink(env.DB, `${ORIGIN}/f/${folder}?desde=x`)).toMatchObject({ type: "folder", folder: { name: "Biología" } });
    expect(await resolveLink(env.DB, `${ORIGIN}/c/abc#token`)).toEqual({ type: "control" });
    expect(await resolveLink(env.DB, "https://otro.sitio/nada")).toEqual({ type: "none" });
    expect(await resolveLink(env.DB, "%E0%A4%A")).toEqual({ type: "none" });
  });
});
