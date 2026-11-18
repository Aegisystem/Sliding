import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import genericDeck from "../../../fixtures/generic.html?raw";
import htmlSlidesDeck from "../../../fixtures/html-slides.html?raw";
import { ada, browser } from "./helpers";

const ORIGIN = "https://app.test";
const small = { deckBytes: 10_000, bytesPerOwner: 15_000 };
let people = 0;

/** Un Dueño nuevo con sesión, para que cada test tenga su propio panel. */
async function owner(limits = small) {
  people += 1;
  const b = browser({ limits, profile: () => ({ ...ada, id: `panel-${people}`, name: `Dueño ${people}` }) });
  await b.login();
  return b;
}

function upload(b: ReturnType<typeof browser>, path: string, html: string, name = "charla.html", type = "text/html") {
  const form = new FormData();
  form.append("file", new File([html], name, { type }));
  return b.request(path, { method: "POST", body: form, headers: { origin: ORIGIN } });
}

const decksOf = async (name: string) =>
  (
    await env.DB.prepare(
      `SELECT d.id, d.title, d.kind, d.size, d.slide_count AS slideCount, d.present_secret AS secret
       FROM decks d JOIN users u ON u.id = d.owner_id WHERE u.name = ? ORDER BY d.created_at`,
    )
      .bind(name)
      .all<{ id: string; title: string; kind: string; size: number; slideCount: number | null; secret: string }>()
  ).results;

describe("el panel", () => {
  it("pide iniciar sesión", async () => {
    const response = await browser().request("/panel");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/");
  });

  it("muestra el programa vacío y el cupo", async () => {
    const b = await owner();
    const html = await (await b.request("/panel")).text();
    expect(html).toContain("Tu programa está vacío.");
    expect(html).toMatch(/<span class="num">0<\/span> presentaciones/);
    expect(html).toContain(">0 MB</span> de");
  });
});

describe("subir", () => {
  it("guarda un Deck html-slides con sus notas aparte y muestra sus dos enlaces", async () => {
    const b = await owner();
    const response = await upload(b, "/panel/decks", htmlSlidesDeck);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/panel?ok=subido");

    const [deck] = await decksOf(`Dueño ${people}`);
    expect(deck).toMatchObject({ title: "Deck de prueba", kind: "html-slides", slideCount: 3 });
    expect(deck!.secret).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(await env.DECKS.get(`deck:${deck!.id}`)).toBe(htmlSlidesDeck);
    expect(JSON.parse((await env.DECKS.get(`notes:${deck!.id}`))!)).toHaveLength(3);

    const html = await (await b.request("/panel?ok=subido")).text();
    expect(html).toContain("Presentación subida.");
    expect(html).toContain(`${ORIGIN}/d/${deck!.id}`);
    expect(html).toContain(`${ORIGIN}/p/${deck!.secret}`);
    expect(html).toContain("Deck de prueba");
  });

  it("guarda un Deck genérico sin notas", async () => {
    const b = await owner();
    await upload(b, "/panel/decks", genericDeck);
    const [deck] = await decksOf(`Dueño ${people}`);
    expect(deck).toMatchObject({ kind: "generic", slideCount: null });
    expect(await env.DECKS.get(`notes:${deck!.id}`)).toBeNull();
  });

  it("usa el nombre del archivo si el deck no tiene <title>", async () => {
    const b = await owner();
    await upload(b, "/panel/decks", "<p>hola</p>", "mi-charla.html");
    expect((await decksOf(`Dueño ${people}`))[0]!.title).toBe("mi-charla");
  });

  it.each([
    ["un archivo que no es HTML", "<p>x</p>", "notas.txt", "text/plain", "no-html"],
    ["un archivo vacío", "", "vacio.html", "text/html", "vacio"],
    ["un deck más grande que el límite", "x".repeat(10_001), "grande.html", "text/html", "muy-grande"],
  ])("rechaza %s", async (_, html, name, type, error) => {
    const b = await owner();
    const response = await upload(b, "/panel/decks", html, name, type);
    expect(response.headers.get("location")).toBe(`/panel?error=${error}`);
    expect(await decksOf(`Dueño ${people}`)).toHaveLength(0);
  });

  it("no limita la cantidad de presentaciones, solo el peso", async () => {
    const b = await owner();
    for (const n of [1, 2, 3, 4, 5]) {
      expect((await upload(b, "/panel/decks", `<title>Charla ${n}</title>`)).headers.get("location")).toBe("/panel?ok=subido");
    }
    expect(await decksOf(`Dueño ${people}`)).toHaveLength(5);
    expect(await (await b.request("/panel")).text()).toMatch(/<span class="num">5<\/span> presentaciones/);
  });

  it("respeta el espacio total por Dueño", async () => {
    const b = await owner();
    await upload(b, "/panel/decks", "a".repeat(9_000));
    const response = await upload(b, "/panel/decks", "b".repeat(9_000));
    expect(response.headers.get("location")).toBe("/panel?error=cupo-espacio");
  });

  it("rechaza subir desde otro origen", async () => {
    const b = await owner();
    const form = new FormData();
    form.append("file", new File(["<p>x</p>"], "x.html", { type: "text/html" }));
    const response = await b.request("/panel/decks", {
      method: "POST",
      body: form,
      headers: { origin: "https://decks.sliding.workers.dev" },
    });
    expect(response.status).toBe(403);
  });
});

describe("reemplazar", () => {
  it("cambia el archivo y mantiene el id y el Enlace para presentar", async () => {
    const b = await owner();
    await upload(b, "/panel/decks", htmlSlidesDeck);
    const [before] = await decksOf(`Dueño ${people}`);
    const response = await upload(b, `/panel/decks/${before!.id}`, genericDeck);
    expect(response.headers.get("location")).toBe("/panel?ok=reemplazado");

    const decks = await decksOf(`Dueño ${people}`);
    expect(decks).toHaveLength(1);
    expect(decks[0]).toMatchObject({ id: before!.id, secret: before!.secret, kind: "generic", title: "Deck genérico de prueba" });
    expect(await env.DECKS.get(`deck:${before!.id}`)).toBe(genericDeck);
    expect(await env.DECKS.get(`notes:${before!.id}`)).toBeNull();
  });

  it("cuenta el espacio sin el archivo que se reemplaza", async () => {
    const b = await owner();
    await upload(b, "/panel/decks", "a".repeat(9_000));
    const [deck] = await decksOf(`Dueño ${people}`);
    const response = await upload(b, `/panel/decks/${deck!.id}`, "b".repeat(9_500));
    expect(response.headers.get("location")).toBe("/panel?ok=reemplazado");
  });

  it("no deja reemplazar el deck de otro Dueño", async () => {
    const owner1 = await owner();
    await upload(owner1, "/panel/decks", htmlSlidesDeck);
    const [deck] = await decksOf(`Dueño ${people}`);
    const intruder = await owner();
    const response = await upload(intruder, `/panel/decks/${deck!.id}`, "<title>Mío</title>");
    expect(response.headers.get("location")).toBe("/panel?error=no-existe");
    expect(await env.DECKS.get(`deck:${deck!.id}`)).toBe(htmlSlidesDeck);
  });
});

describe("borrar", () => {
  it("borra el deck, su archivo y sus notas, y su enlace da 404", async () => {
    const b = await owner();
    await upload(b, "/panel/decks", htmlSlidesDeck);
    const [deck] = await decksOf(`Dueño ${people}`);
    const response = await b.request(`/panel/decks/${deck!.id}/delete`, { method: "POST", headers: { origin: ORIGIN } });
    expect(response.headers.get("location")).toBe("/panel?ok=borrado");
    expect(await decksOf(`Dueño ${people}`)).toHaveLength(0);
    expect(await env.DECKS.get(`deck:${deck!.id}`)).toBeNull();
    expect(await env.DECKS.get(`notes:${deck!.id}`)).toBeNull();
    expect((await b.request(`/d/${deck!.id}`)).status).toBe(404);
  });

  it("no deja borrar el deck de otro Dueño", async () => {
    const owner1 = await owner();
    await upload(owner1, "/panel/decks", htmlSlidesDeck);
    const name = `Dueño ${people}`;
    const [deck] = await decksOf(name);
    const intruder = await owner();
    const response = await intruder.request(`/panel/decks/${deck!.id}/delete`, { method: "POST", headers: { origin: ORIGIN } });
    expect(response.headers.get("location")).toBe("/panel?error=no-existe");
    expect(await decksOf(name)).toHaveLength(1);
  });
});

describe("Enlace para presentar", () => {
  it("abre la página del deck con el secreto correcto y da 404 con uno inventado", async () => {
    const b = await owner();
    await upload(b, "/panel/decks", htmlSlidesDeck);
    const [deck] = await decksOf(`Dueño ${people}`);
    const response = await browser().request(`/p/${deck!.secret}`);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Presentar «Deck de prueba»");
    expect((await browser().request("/p/AAAAAAAAAAAAAAAAAAAAAA")).status).toBe(404);
  });
});
