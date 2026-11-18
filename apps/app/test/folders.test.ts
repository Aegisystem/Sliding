import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import htmlSlidesDeck from "../../../fixtures/html-slides.html?raw";
import { ada, browser } from "./helpers";

const ORIGIN = "https://app.test";
let people = 0;

/** Un Dueño nuevo con sesión, con su propio panel. */
async function owner() {
  people += 1;
  const name = `Docente ${people}`;
  const b = browser({ profile: () => ({ ...ada, id: `carpetas-${people}`, name }) });
  await b.login();

  const post = (path: string, fields: Record<string, string | File>) => {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    return b.request(path, { method: "POST", body: form, headers: { origin: ORIGIN } });
  };
  const folders = async () =>
    (
      await env.DB.prepare(
        `SELECT f.id, f.name, f.parent_id AS parentId, f.position FROM folders f
         JOIN users u ON u.id = f.owner_id WHERE u.name = ? ORDER BY f.created_at, f.rowid`,
      )
        .bind(name)
        .all<{ id: string; name: string; parentId: string | null; position: number }>()
    ).results;
  const decks = async () =>
    (
      await env.DB.prepare(
        `SELECT d.id, d.title, d.folder_id AS folderId, d.position, d.present_secret AS secret FROM decks d
         JOIN users u ON u.id = d.owner_id WHERE u.name = ? ORDER BY d.created_at, d.rowid`,
      )
        .bind(name)
        .all<{ id: string; title: string; folderId: string | null; position: number; secret: string }>()
    ).results;
  /** Crea una carpeta y devuelve su id. */
  const folder = async (nombre: string, carpeta?: string) => {
    await post("/panel/carpetas", { nombre, ...(carpeta ? { carpeta } : {}) });
    return (await folders()).at(-1)!.id;
  };
  /** Sube una presentación y devuelve su id. */
  const deck = async (title: string, carpeta?: string, html = `<title>${title}</title>`) => {
    await post("/panel/decks", { file: new File([html], "charla.html", { type: "text/html" }), ...(carpeta ? { carpeta } : {}) });
    return (await decks()).at(-1)!.id;
  };
  const order = (body: unknown, origin = ORIGIN) =>
    b.request("/panel/orden", { method: "POST", body: JSON.stringify(body), headers: { origin, "content-type": "application/json" } });
  const page = async (path: string) => (await b.request(path)).text();
  return { ...b, name, post, folders, decks, folder, deck, order, page };
}

const location = (response: Response) => response.headers.get("location");

describe("crear carpetas", () => {
  it("crea carpetas dentro de carpetas, sin límite de niveles", async () => {
    const t = await owner();
    const course = await t.folder("Biología 2027");
    const unit = await t.folder("Unidad 1", course);
    const week = await t.folder("Semana 1", unit);
    expect(await t.folders()).toMatchObject([
      { id: course, name: "Biología 2027", parentId: null },
      { id: unit, name: "Unidad 1", parentId: course },
      { id: week, name: "Semana 1", parentId: unit },
    ]);

    const html = await t.page(`/panel/f/${week}`);
    expect(html).toContain("<h1>Semana 1</h1>");
    // La ruta lleva a cada carpeta de arriba.
    expect(html).toContain(`<a href="/panel">Tus presentaciones</a>`);
    expect(html).toContain(`<a href="/panel/f/${course}">Biología 2027</a>`);
    expect(html).toContain(`<a href="/panel/f/${unit}">Unidad 1</a>`);
    expect(html).toContain("Esta carpeta está vacía.");
  });

  it("vuelve a la carpeta donde se creó", async () => {
    const t = await owner();
    const course = await t.folder("Física");
    const response = await t.post("/panel/carpetas", { nombre: "Unidad 1", carpeta: course });
    expect(location(response)).toBe(`/panel/f/${course}?ok=carpeta-creada`);
  });

  it.each([
    ["vacío", "   "],
    ["de más de 80 caracteres", "x".repeat(81)],
  ])("rechaza un nombre %s", async (_, nombre) => {
    const t = await owner();
    const response = await t.post("/panel/carpetas", { nombre });
    expect(location(response)).toBe("/panel?error=nombre");
    expect(await t.folders()).toHaveLength(0);
  });

  it("no crea carpetas dentro de la carpeta de otro Dueño", async () => {
    const other = await owner();
    const theirs = await other.folder("Ajena");
    const t = await owner();
    await t.post("/panel/carpetas", { nombre: "Intrusa", carpeta: theirs });
    expect(await t.folders()).toMatchObject([{ name: "Intrusa", parentId: null }]);
    expect(await other.folders()).toHaveLength(1);
  });

  it("rechaza crear carpetas desde otro origen", async () => {
    const t = await owner();
    const form = new FormData();
    form.append("nombre", "Física");
    const response = await t.request("/panel/carpetas", { method: "POST", body: form, headers: { origin: "https://decks.sliding.workers.dev" } });
    expect(response.status).toBe(403);
  });
});

describe("el panel con carpetas", () => {
  it("muestra en cada carpeta solo lo suyo, con rótulos cuando hay carpetas y presentaciones", async () => {
    const t = await owner();
    const course = await t.folder("Química");
    await t.folder("Unidad 1", course);
    const loose = await t.deck("Charla suelta");
    const inside = await t.deck("Charla del curso", course);

    const root = await t.page("/panel");
    expect(root).toContain(`href="/panel/f/${course}"`);
    expect(root).toContain("Charla suelta");
    expect(root).not.toContain("Charla del curso");
    expect(root).toContain(`<h2 class="program-label">Carpetas</h2>`);
    expect(root).toContain(`<h2 class="program-label">Presentaciones</h2>`);
    // La carpeta se comparte con un botón, sin mostrar su dirección.
    expect(root).toContain(`data-copy="${ORIGIN}/f/${course}"`);

    const html = await t.page(`/panel/f/${course}`);
    expect(html).toContain("Charla del curso");
    expect(html).not.toContain("Charla suelta");
    expect(html).toContain(`data-id="${inside}"`);
    expect(html).not.toContain(`data-id="${loose}"`);
  });

  it("sube la presentación a la carpeta abierta y vuelve a ella", async () => {
    const t = await owner();
    const course = await t.folder("Historia");
    const response = await t.post("/panel/decks", {
      file: new File([htmlSlidesDeck], "charla.html", { type: "text/html" }),
      carpeta: course,
    });
    expect(location(response)).toBe(`/panel/f/${course}?ok=subido`);
    expect(await t.decks()).toMatchObject([{ folderId: course }]);
  });

  it("vuelve a la carpeta abierta después de reemplazar o borrar", async () => {
    const t = await owner();
    const course = await t.folder("Arte");
    const id = await t.deck("Charla", course);
    const replaced = await t.post(`/panel/decks/${id}`, { file: new File(["<title>Nueva</title>"], "n.html", { type: "text/html" }), volver: course });
    expect(location(replaced)).toBe(`/panel/f/${course}?ok=reemplazado`);
    const deleted = await t.post(`/panel/decks/${id}/delete`, { volver: course });
    expect(location(deleted)).toBe(`/panel/f/${course}?ok=borrado`);
  });

  it("da 404 con la carpeta de otro Dueño", async () => {
    const other = await owner();
    const theirs = await other.folder("Privada");
    const t = await owner();
    const response = await t.request(`/panel/f/${theirs}`);
    expect(response.status).toBe(404);
    expect(await response.text()).toContain("Carpeta no encontrada");
  });

  it("ofrece «Mover a» con la ruta de cada carpeta, sin la carpeta misma ni las de dentro", async () => {
    const t = await owner();
    const course = await t.folder("Música");
    const unit = await t.folder("Unidad 1", course);
    const week = await t.folder("Semana 1", unit);
    const other = await t.folder("Teatro");
    const html = await t.page("/panel");
    const courseMove = html.slice(html.indexOf(`id="mover-${course}"`), html.indexOf("</select>", html.indexOf(`id="mover-${course}"`)));
    expect(courseMove).toContain(`value="${other}"`);
    expect(courseMove).not.toContain(`value="${unit}"`);
    expect(courseMove).not.toContain(`value="${week}"`);
    expect(courseMove).not.toContain(`value="${course}"`);

    await t.deck("Charla");
    const withDeck = await t.page("/panel");
    expect(withDeck).toContain(">Música / Unidad 1 / Semana 1</option>");
  });
});

describe("mover", () => {
  it("mueve una presentación a una carpeta, al final, y de vuelta a la raíz", async () => {
    const t = await owner();
    const course = await t.folder("Lenguaje");
    await t.deck("Primera", course);
    const id = await t.deck("Segunda");

    const moved = await t.post(`/panel/decks/${id}/mover`, { destino: course });
    expect(location(moved)).toBe("/panel?ok=movido");
    expect((await t.decks()).find((d) => d.id === id)).toMatchObject({ folderId: course, position: 1 });

    const back = await t.post(`/panel/decks/${id}/mover`, { destino: "raiz", volver: course });
    expect(location(back)).toBe(`/panel/f/${course}?ok=movido`);
    expect((await t.decks()).find((d) => d.id === id)).toMatchObject({ folderId: null });
  });

  it("no mueve presentaciones a la carpeta de otro Dueño ni las de otro Dueño", async () => {
    const other = await owner();
    const theirs = await other.folder("Ajena");
    const theirDeck = await other.deck("Ajena");
    const t = await owner();
    const mine = await t.deck("Mía");
    const mineFolder = await t.folder("Mía");

    expect(location(await t.post(`/panel/decks/${mine}/mover`, { destino: theirs }))).toBe("/panel?error=no-existe");
    expect(location(await t.post(`/panel/decks/${theirDeck}/mover`, { destino: mineFolder }))).toBe("/panel?error=no-existe");
    expect((await t.decks())[0]).toMatchObject({ folderId: null });
    expect((await other.decks())[0]).toMatchObject({ folderId: null });
  });

  it("mueve una carpeta con todo lo que tiene dentro", async () => {
    const t = await owner();
    const course = await t.folder("Geografía");
    const unit = await t.folder("Unidad 1");
    const id = await t.deck("Mapas", unit);
    expect(location(await t.post(`/panel/carpetas/${unit}/mover`, { destino: course }))).toBe("/panel?ok=carpeta-movida");
    expect((await t.folders()).find((f) => f.id === unit)).toMatchObject({ parentId: course });
    expect((await t.decks()).find((d) => d.id === id)).toMatchObject({ folderId: unit });
  });

  it("no mete una carpeta dentro de sí misma ni de una de las suyas", async () => {
    const t = await owner();
    const course = await t.folder("Física");
    const unit = await t.folder("Unidad 1", course);
    const week = await t.folder("Semana 1", unit);
    for (const destino of [course, unit, week]) {
      expect(location(await t.post(`/panel/carpetas/${course}/mover`, { destino }))).toBe("/panel?error=ciclo");
    }
    expect((await t.folders())[0]).toMatchObject({ id: course, parentId: null });
  });
});

describe("cambiar el nombre", () => {
  it("renombra la carpeta y valida el nombre", async () => {
    const t = await owner();
    const id = await t.folder("Fisica");
    expect(location(await t.post(`/panel/carpetas/${id}/nombre`, { nombre: "  Física   1 " }))).toBe(`/panel/f/${id}?ok=carpeta-renombrada`);
    expect((await t.folders())[0]).toMatchObject({ name: "Física 1" });
    expect(location(await t.post(`/panel/carpetas/${id}/nombre`, { nombre: "" }))).toBe(`/panel/f/${id}?error=nombre`);
  });

  it("no renombra la carpeta de otro Dueño", async () => {
    const other = await owner();
    const theirs = await other.folder("Suya");
    const t = await owner();
    expect(location(await t.post(`/panel/carpetas/${theirs}/nombre`, { nombre: "Mía" }))).toBe("/panel?error=no-existe");
    expect((await other.folders())[0]).toMatchObject({ name: "Suya" });
  });
});

describe("borrar una carpeta", () => {
  it("deja lo que tenía dentro en la carpeta de arriba, después de lo que ya estaba ahí", async () => {
    const t = await owner();
    const course = await t.folder("Inglés");
    const unit = await t.folder("Unidad 1", course);
    const week = await t.folder("Semana 1", unit);
    await t.deck("Ya estaba", course);
    const inside = await t.deck("Dentro", unit);

    const response = await t.post(`/panel/carpetas/${unit}/borrar`, {});
    expect(location(response)).toBe(`/panel/f/${course}?ok=carpeta-borrada`);
    expect((await t.folders()).map((f) => f.id)).toEqual([course, week]);
    expect((await t.folders()).find((f) => f.id === week)).toMatchObject({ parentId: course });
    expect((await t.decks()).find((d) => d.id === inside)).toMatchObject({ folderId: course, position: 1 });
    expect((await t.request(`/f/${unit}`)).status).toBe(404);
  });

  it("no borra la carpeta de otro Dueño", async () => {
    const other = await owner();
    const theirs = await other.folder("Suya");
    const t = await owner();
    expect(location(await t.post(`/panel/carpetas/${theirs}/borrar`, {}))).toBe("/panel?error=no-existe");
    expect(await other.folders()).toHaveLength(1);
  });
});

describe("ordenar", () => {
  it("guarda el orden de las presentaciones y el panel lo respeta", async () => {
    const t = await owner();
    const course = await t.folder("Arte");
    const a = await t.deck("Alfa", course);
    const b = await t.deck("Beta", course);
    const c = await t.deck("Gamma", course);
    const response = await t.order({ parent: course, kind: "decks", ids: [c, a, b] });
    expect(response.status).toBe(204);
    const html = await t.page(`/panel/f/${course}`);
    expect(html.indexOf("Gamma")).toBeLessThan(html.indexOf("Alfa"));
    expect(html.indexOf("Alfa")).toBeLessThan(html.indexOf("Beta"));
  });

  it("guarda el orden de las carpetas de la raíz", async () => {
    const t = await owner();
    const a = await t.folder("Primera");
    const b = await t.folder("Segunda");
    expect((await t.order({ parent: null, kind: "folders", ids: [b, a] })).status).toBe(204);
    expect((await t.folders()).map((f) => [f.id, f.position])).toEqual([
      [a, 1],
      [b, 0],
    ]);
  });

  it("rechaza un orden incompleto, con ids ajenos o de otra carpeta", async () => {
    const other = await owner();
    const theirs = await other.deck("Ajena");
    const t = await owner();
    const course = await t.folder("Curso");
    const a = await t.deck("Alfa");
    const b = await t.deck("Beta");
    const inside = await t.deck("Dentro", course);
    for (const ids of [[a], [a, b, theirs], [a, inside], [a, a]]) {
      expect((await t.order({ parent: null, kind: "decks", ids })).status, JSON.stringify(ids)).toBe(400);
    }
    expect((await t.order({ parent: null, kind: "tablas", ids: [a, b] })).status).toBe(400);
    expect((await t.order({ parent: other.name, kind: "decks", ids: [a, b] })).status).toBe(404);
  });

  it("rechaza ordenar desde otro origen", async () => {
    const t = await owner();
    const a = await t.deck("Alfa");
    const b = await t.deck("Beta");
    expect((await t.order({ parent: null, kind: "decks", ids: [b, a] }, "https://decks.sliding.workers.dev")).status).toBe(403);
  });
});

describe("Enlace de la carpeta", () => {
  it("muestra sus carpetas y presentaciones, sin notas ni Enlace para presentar", async () => {
    const t = await owner();
    const course = await t.folder("Biología");
    const unit = await t.folder("Unidad 1", course);
    await t.deck("Célula", course, htmlSlidesDeck);
    const [deck] = await t.decks();

    const visitor = browser();
    const response = await visitor.request(`/f/${course}`);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("<h1>Biología</h1>");
    expect(html).toContain(`<meta name="robots" content="noindex" />`);
    expect(html).toContain(`href="/d/${deck!.id}"`);
    expect(html).toContain(`href="/f/${unit}?desde=${course}"`);
    expect(html).not.toContain(deck!.secret);
    expect(html).not.toContain("/p/");
    expect(html).not.toContain("Nota 1");
  });

  it("muestra la ruta solo desde la carpeta por la que se entró", async () => {
    const t = await owner();
    const course = await t.folder("Curso secreto");
    const unit = await t.folder("Unidad 1", course);
    const week = await t.folder("Semana 1", unit);
    const visitor = browser();

    const fromUnit = await (await visitor.request(`/f/${week}?desde=${unit}`)).text();
    expect(fromUnit).toContain(`<a href="/f/${unit}">Unidad 1</a>`);
    expect(fromUnit).not.toContain("Curso secreto");

    // Quien recibió solo el enlace de la semana no ve las carpetas de arriba.
    const direct = await (await visitor.request(`/f/${week}`)).text();
    expect(direct).not.toContain("Unidad 1");
    expect(direct).not.toContain("Curso secreto");

    // Un `desde` que no está arriba de la carpeta no cuenta.
    const other = await t.folder("Otra");
    const bogus = await (await visitor.request(`/f/${week}?desde=${other}`)).text();
    expect(bogus).not.toContain(">Otra<");
  });

  it("no muestra presentaciones desactivadas", async () => {
    const t = await owner();
    const course = await t.folder("Curso");
    const id = await t.deck("Oculta", course);
    await env.DB.prepare("UPDATE decks SET disabled = 1 WHERE id = ?").bind(id).run();
    const html = await (await browser().request(`/f/${course}`)).text();
    expect(html).not.toContain("Oculta");
    expect(html).toContain("Esta carpeta todavía está vacía.");
  });

  it("da 404 si la carpeta no existe o el id no es válido", async () => {
    for (const path of ["/f/no-es-un-id", "/f/AAAAAAAAAAAAAAAAAAAAAA"]) {
      const response = await browser().request(path);
      expect(response.status, path).toBe(404);
      expect(await response.text()).toContain("Carpeta no encontrada");
    }
  });

  it("escapa el nombre de la carpeta", async () => {
    const t = await owner();
    const id = await t.folder(`<script>alert("x")</script>`);
    const html = await (await browser().request(`/f/${id}`)).text();
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });
});
