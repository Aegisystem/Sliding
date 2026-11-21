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
  /** Muestra en el Enlace de su carpeta una presentación o carpeta, que llegan ocultas (#23). */
  const show = (kind: "decks" | "carpetas", id: string, visible = "1") => post(`/panel/${kind}/${id}/visible`, { visible });
  return { ...b, name, post, folders, decks, folder, deck, order, page, show };
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
    // La ruta lleva a cada carpeta de arriba, y cada una recibe lo que se arrastra (#20).
    expect(html).toContain(`<a href="/panel" data-drop="raiz">Tus presentaciones</a>`);
    expect(html).toContain(`<a href="/panel/f/${course}" data-drop="${course}">Biología 2027</a>`);
    expect(html).toContain(`<a href="/panel/f/${unit}" data-drop="${unit}">Unidad 1</a>`);
    expect(html).toContain("Esta carpeta está vacía.");
    expect(html).not.toMatch(/<div class="empty" data-empty\s+hidden>/);
  });

  it("con algo dentro, el aviso de vacía queda oculto y cada carpeta dice lo que tiene (#20)", async () => {
    const t = await owner();
    const course = await t.folder("Química");
    const unit = await t.folder("Unidad 1", course);
    await t.folder("Semana 1", unit);
    await t.deck("Átomos", unit);
    const html = await t.page(`/panel/f/${course}`);
    // Si se le saca la última hilera arrastrándola, el panel muestra el aviso sin recargar.
    expect(html).toMatch(/<div class="empty" data-empty\s+hidden>\s*<h2>Esta carpeta está vacía.<\/h2>/);
    expect(html).toContain(`data-id="${unit}" data-decks="1" data-folders="1"`);
  });

  it("vuelve a la carpeta donde se creó", async () => {
    const t = await owner();
    const course = await t.folder("Física");
    const response = await t.post("/panel/carpetas", { nombre: "Unidad 1", carpeta: course });
    expect(location(response)).toBe(`/panel/f/${course}?ok=carpeta-creada-oculta`);
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
    expect(location(response)).toBe(`/panel/f/${course}?ok=subida-oculta`);
    expect(await t.page(location(response)!)).toContain("Está oculta en esta carpeta");
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

  it("muestra el árbol de carpetas, abierto hasta la carpeta abierta (#21)", async () => {
    const t = await owner();
    const course = await t.folder("Música");
    const unit = await t.folder("Unidad 1", course);
    const week = await t.folder("Semana 1", unit);
    const other = await t.folder("Teatro");
    const act = await t.folder("Acto 1", other);
    const html = await t.page(`/panel/f/${unit}`);
    const tree = html.slice(html.indexOf('<nav class="tree"'), html.indexOf("</nav>", html.indexOf('<nav class="tree"')));
    // Cada carpeta del árbol recibe lo que se arrastra; la abierta va marcada.
    expect(tree).toMatch(/<a class="tree-link" href="\/panel" data-drop="raiz"\s*>Tus presentaciones<\/a>/);
    expect(tree).toMatch(new RegExp(`<a class="tree-link is-hidden" href="/panel/f/${unit}" data-drop="${unit}" aria-current="page">Unidad 1<span`));
    for (const id of [course, week, other, act]) expect(tree).toContain(`href="/panel/f/${id}" data-drop="${id}"`);
    // La ruta hasta la carpeta abierta se ve; lo de Teatro queda cerrado.
    const branchOf = (id: string) => {
      const start = tree.indexOf(`<li data-folder="${id}">`);
      return tree.slice(start, tree.indexOf("</a>", start) + 200);
    };
    expect(branchOf(course)).toContain('aria-expanded="true"');
    expect(branchOf(unit)).toContain('aria-expanded="true"');
    expect(branchOf(other)).toContain('aria-expanded="false"');
    expect(branchOf(other)).toMatch(/<ul class="tree-list"\s+hidden>/);
  });

  it("sin carpetas no muestra el árbol (#21)", async () => {
    const t = await owner();
    await t.deck("Charla");
    expect(await t.page("/panel")).not.toContain('<nav class="tree"');
  });

  it("deja Reemplazar, Mover a y Borrar en el menú «Más» de cada hilera (#21)", async () => {
    const t = await owner();
    await t.folder("Música");
    await t.deck("Charla");
    const html = await t.page("/panel");
    const menus = html.split('<details class="more">').slice(1).map((part) => part.slice(0, part.indexOf("</details>")));
    expect(menus).toHaveLength(2);
    const [folderMenu, deckMenu] = menus;
    expect(folderMenu).toContain("Más<span class=\"visually-hidden\"> sobre «Música»</span>");
    expect(folderMenu).toContain('class="delete"');
    expect(deckMenu).toContain('class="replace"');
    expect(deckMenu).toContain('class="move"');
    expect(deckMenu).toContain('class="delete"');
  });

  it("«Nueva carpeta» pide el nombre con su rótulo, y lo deja abierto si faltó (#21)", async () => {
    const t = await owner();
    const course = await t.folder("Música");
    const html = await t.page(`/panel/f/${course}`);
    expect(html).toContain("data-new-folder");
    expect(html).toContain('<label for="nueva-carpeta">Carpeta nueva dentro de «Música»</label>');
    expect(html).not.toMatch(/<form class="new-folder"[^>]*data-open/);

    const response = await t.post("/panel/carpetas", { nombre: "  ", carpeta: course });
    expect(location(response)).toBe(`/panel/f/${course}?error=nombre`);
    expect(await t.page(location(response)!)).toMatch(/<form class="new-folder"[^>]*data-open/);
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

  it("al arrastrar contesta en JSON, sin redirigir (#20)", async () => {
    const t = await owner();
    const course = await t.folder("Historia");
    const unit = await t.folder("Unidad 1", course);
    const id = await t.deck("Roma");
    const drop = (path: string, destino: string) => {
      const form = new FormData();
      form.append("destino", destino);
      return t.request(path, { method: "POST", body: form, headers: { origin: ORIGIN, accept: "application/json" } });
    };

    const moved = await drop(`/panel/decks/${id}/mover`, course);
    expect(moved.status).toBe(204);
    expect((await t.decks())[0]).toMatchObject({ folderId: course });
    expect((await drop(`/panel/carpetas/${unit}/mover`, "raiz")).status).toBe(204);
    expect((await t.folders()).find((f) => f.id === unit)).toMatchObject({ parentId: null });

    const cycle = await drop(`/panel/carpetas/${course}/mover`, course);
    expect(cycle.status).toBe(400);
    expect(await cycle.json()).toEqual({ error: "ciclo" });
    const missing = await drop(`/panel/decks/${id}/mover`, "no-existe");
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "no-existe" });
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
    await t.show("carpetas", unit);
    await t.show("decks", deck!.id);

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
    const id = await t.deck("Charla desactivada", course);
    await t.show("decks", id);
    await env.DB.prepare("UPDATE decks SET disabled = 1 WHERE id = ?").bind(id).run();
    const html = await (await browser().request(`/f/${course}`)).text();
    expect(html).not.toContain("Charla desactivada");
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

describe("mostrar y ocultar en el Enlace de la carpeta (#23)", () => {
  it("lo nuevo llega oculto y se ve en la carpeta solo al mostrarlo, con las cifras de lo que se ve", async () => {
    const t = await owner();
    const course = await t.folder("Química");
    const unit1 = await t.folder("Unidad 1", course);
    const unit2 = await t.folder("Unidad 2", course);
    const intro = await t.deck("Introducción", course);
    await t.deck("Examen", course);
    const visitor = browser();

    let html = await (await visitor.request(`/f/${course}`)).text();
    expect(html).toContain("Esta carpeta todavía está vacía.");
    expect(html).not.toMatch(/Unidad 1|Introducción|Examen/);

    await t.show("carpetas", unit1);
    await t.show("decks", intro);
    html = await (await visitor.request(`/f/${course}`)).text();
    expect(html).toContain(`href="/f/${unit1}?desde=${course}"`);
    expect(html).toContain(`href="/d/${intro}"`);
    expect(html).not.toContain(unit2);
    expect(html).not.toContain("Examen");
    expect(html).toMatch(/<p class="folder-sub">\s*<span class="num">1<\/span> presentación · <span class="num">1<\/span> carpeta/);

    // Ocultar lo vuelve a sacar.
    await t.show("decks", intro, "0");
    expect(await (await visitor.request(`/f/${course}`)).text()).not.toContain("Introducción");
  });

  it("lo que tiene una carpeta oculta no se ve desde arriba, y las cifras no lo cuentan", async () => {
    const t = await owner();
    const course = await t.folder("Física");
    const unit = await t.folder("Unidad 1", course);
    const week = await t.folder("Semana 1", unit);
    const lesson = await t.deck("Caída libre", unit);
    await t.show("carpetas", week);
    await t.show("decks", lesson);
    await t.show("carpetas", unit);

    // Visible, Unidad 1 dice lo suyo; oculta una semana, deja de contarla.
    let html = await (await browser().request(`/f/${course}`)).text();
    expect(html).toContain("Carpeta · <span class=\"num\">1</span> carpeta dentro");
    await t.show("carpetas", week, "0");
    html = await (await browser().request(`/f/${course}`)).text();
    expect(html).not.toContain("carpeta dentro");

    await t.show("carpetas", unit, "0");
    html = await (await browser().request(`/f/${course}`)).text();
    expect(html).not.toContain("Unidad 1");
    expect(html).not.toContain("Caída libre");
  });

  it("ocultar no apaga el enlace propio ni el Enlace para presentar", async () => {
    const t = await owner();
    const course = await t.folder("Historia");
    const unit = await t.folder("Unidad 1", course);
    const id = await t.deck("Roma", course);
    const [deck] = await t.decks();
    const visitor = browser();
    expect((await visitor.request(`/d/${id}`)).status).toBe(200);
    expect((await visitor.request(`/p/${deck!.secret}`)).status).toBe(200);
    expect((await visitor.request(`/f/${unit}`)).status).toBe(200);
  });

  it("lo que ya existía antes sigue visible", async () => {
    const t = await owner();
    const course = await t.folder("Arte");
    const id = await t.deck("Barroco", course);
    // Así quedó lo de antes de la migración: la columna en 0.
    await env.DB.prepare("UPDATE decks SET hidden = 0 WHERE id = ?").bind(id).run();
    expect(await (await browser().request(`/f/${course}`)).text()).toContain("Barroco");
  });

  it("en el panel, dentro de una carpeta, lo oculto lleva su sello y «Mostrar»; en la raíz no", async () => {
    const t = await owner();
    const course = await t.folder("Música");
    const id = await t.deck("Ritmo", course);
    await t.deck("Suelta");
    const inside = await t.page(`/panel/f/${course}`);
    expect(inside).toContain(`<li class="session is-hidden" data-id="${id}">`);
    expect(inside).toContain('<span class="stamp stamp-small">Oculta</span>');
    expect(inside).toContain(`action="/panel/decks/${id}/visible"`);
    expect(inside).toMatch(/<button class="btn btn-small btn-ink" type="submit">Mostrar<span class="visually-hidden"> «Ritmo»<\/span><\/button>/);
    expect(inside).toContain("Ocultar de la carpeta");

    await t.show("decks", id);
    expect(await t.page(`/panel/f/${course}`)).toContain(`<li class="session" data-id="${id}">`);

    const root = await t.page("/panel");
    expect(root).not.toContain('class="session-hidden"');
    expect(root).not.toContain("Ocultar de la carpeta");
  });

  it("contesta en JSON al panel, vuelve a la carpeta sin JS y no toca lo ajeno", async () => {
    const t = await owner();
    const course = await t.folder("Teatro");
    const id = await t.deck("Acto 1", course);
    const json = await t.request(`/panel/decks/${id}/visible`, {
      method: "POST",
      body: new URLSearchParams({ visible: "1" }),
      headers: { origin: ORIGIN, accept: "application/json" },
    });
    expect(json.status).toBe(204);

    const back = await t.show("carpetas", course, "0");
    expect(back.status).toBe(303);
    expect(location(back)).toBe("/panel?ok=carpeta-oculta");
    const inFolder = await t.post(`/panel/decks/${id}/visible`, { visible: "0", volver: course });
    expect(location(inFolder)).toBe(`/panel/f/${course}?ok=oculta`);

    const intruder = await owner();
    expect(location(await intruder.show("decks", id))).toBe("/panel?error=no-existe");
    expect(location(await intruder.show("carpetas", course))).toBe("/panel?error=no-existe");
    expect((await t.decks())[0]!.id).toBe(id);
    const hidden = await env.DB.prepare("SELECT hidden FROM decks WHERE id = ?").bind(id).first<{ hidden: number }>();
    expect(hidden?.hidden).toBe(1);

    const foreign = await t.request(`/panel/decks/${id}/visible`, {
      method: "POST",
      body: new URLSearchParams({ visible: "1" }),
      headers: { origin: "https://otro.test" },
    });
    expect(foreign.status).toBe(403);
  });
});
