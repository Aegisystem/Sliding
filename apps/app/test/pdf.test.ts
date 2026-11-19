import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import htmlSlidesDeck from "../../../fixtures/html-slides.html?raw";
import { parseNotes } from "../src/decks/notes";
import { ada, browser } from "./helpers";

const ORIGIN = "https://app.test";
let people = 0;

async function owner() {
  people += 1;
  const b = browser({
    limits: { deckBytes: 10_000, bytesPerOwner: 15_000 },
    profile: () => ({ ...ada, id: `pdf-${people}`, name: `Dueño PDF ${people}` }),
  });
  await b.login();
  return b;
}

/** Un PDF mínimo, como los que exportan PowerPoint y Keynote: el árbol de páginas sin comprimir. */
function pdf(pages: number): string {
  const kids = Array.from({ length: pages }, (_, i) => `${i + 3} 0 R`).join(" ");
  const objects = Array.from({ length: pages }, (_, i) => `${i + 3} 0 obj\n<</Type/Page/Parent 2 0 R/MediaBox[0 0 960 540]>>\nendobj\n`);
  return `%PDF-1.7\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n2 0 obj\n<</Type/Pages/Count ${pages}/Kids[${kids}]>>\nendobj\n${objects.join("")}%%EOF\n`;
}

const slides = (n: number) => Array.from({ length: n }, (_, i) => ({ title: `Título ${i + 1}`, notes: `Nota ${i + 1}` }));

function send(
  b: Awaited<ReturnType<typeof owner>>,
  path: string,
  { file, notes }: { file?: File; notes?: unknown } = {},
) {
  const form = new FormData();
  if (file) form.append("file", file);
  if (notes !== undefined) form.append("notas", typeof notes === "string" ? notes : JSON.stringify(notes));
  return b.request(path, { method: "POST", body: form, headers: { origin: ORIGIN } });
}

const pdfFile = (pages: number, name = "Clase 3.pdf") => new File([pdf(pages)], name, { type: "application/pdf" });

const deckOf = async () =>
  (await env.DB.prepare(
    `SELECT d.id, d.title, d.kind, d.slide_count AS slideCount, d.notes_count AS notesCount, d.updated_at AS updatedAt
     FROM decks d JOIN users u ON u.id = d.owner_id WHERE u.name = ?`,
  )
    .bind(`Dueño PDF ${people}`)
    .first<{ id: string; title: string; kind: string; slideCount: number | null; notesCount: number | null; updatedAt: number }>())!;

const storedNotes = async (id: string) => JSON.parse((await env.DECKS.get(`notes:${id}`)) ?? "null");

describe("subir una Presentación en PDF", () => {
  it("guarda el PDF tal cual, cuenta sus diapositivas y usa el nombre del archivo", async () => {
    const b = await owner();
    const response = await send(b, "/panel/decks", { file: pdfFile(4) });
    expect(response.headers.get("location")).toBe("/panel?ok=subido");
    const deck = await deckOf();
    expect(deck).toMatchObject({ title: "Clase 3", kind: "pdf", slideCount: 4, notesCount: null });
    expect(new TextDecoder().decode((await env.DECKS.get(`deck:${deck.id}`, "arrayBuffer"))!)).toBe(pdf(4));
    expect(await env.DECKS.get(`notes:${deck.id}`)).toBeNull();

    const html = await (await b.request("/panel")).text();
    expect(html).toContain('class="session-code track-naranja"');
    expect(html).toMatch(/<span class="session-count num">4<\/span><span class="session-unit">diapositivas<\/span>/);
    expect(html).toContain("PDF ·\n      sin notas");
    expect(html).toContain("Agregar notas");
  });

  it("guarda las notas que el navegador leyó del .pptx", async () => {
    const b = await owner();
    await send(b, "/panel/decks", { file: pdfFile(2), notes: slides(2) });
    const deck = await deckOf();
    expect(deck).toMatchObject({ slideCount: 2, notesCount: 2 });
    expect(await storedNotes(deck.id)).toEqual(slides(2));
    const html = await (await b.request("/panel")).text();
    expect(html).toContain("con notas");
    expect(html).toContain("Cambiar notas");
    expect(html).not.toContain("Las notas no coinciden");
  });

  it("avisa si el .pptx y el PDF no tienen las mismas diapositivas", async () => {
    const b = await owner();
    await send(b, "/panel/decks", { file: pdfFile(2), notes: slides(3) });
    const html = await (await b.request("/panel")).text();
    expect(html).toContain("Las notas no coinciden");
    expect(html).toMatch(/el \.pptx tiene <span class="num">3<\/span> diapositivas visibles y el PDF <span class="num">2<\/span>/);
  });

  it("rechaza un .pdf que no es un PDF", async () => {
    const b = await owner();
    const response = await send(b, "/panel/decks", { file: new File(["<p>hola</p>"], "falso.pdf", { type: "application/pdf" }) });
    expect(response.headers.get("location")).toBe("/panel?error=no-pdf");
    expect(await deckOf()).toBeNull();
  });

  it("rechaza un .pptx solo: hay que exportarlo como PDF", async () => {
    const b = await owner();
    const pptx = new File(["PK"], "charla.pptx", { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
    expect((await send(b, "/panel/decks", { file: pptx })).headers.get("location")).toBe("/panel?error=formato");
  });

  it("rechaza notas que no tienen la forma esperada, sin guardar nada", async () => {
    const b = await owner();
    for (const notes of ["{", "[]", '[{"title":1,"notes":"x"}]', '"texto"']) {
      expect((await send(b, "/panel/decks", { file: pdfFile(1), notes })).headers.get("location")).toBe("/panel?error=notas");
    }
    expect(await deckOf()).toBeNull();
  });
});

describe("reemplazar una Presentación en PDF", () => {
  it("con otro PDF sin .pptx, se quedan las notas que tenía", async () => {
    const b = await owner();
    await send(b, "/panel/decks", { file: pdfFile(2), notes: slides(2) });
    const { id } = await deckOf();
    expect((await send(b, `/panel/decks/${id}`, { file: pdfFile(2, "Clase 3 v2.pdf") })).headers.get("location")).toBe(
      "/panel?ok=reemplazado",
    );
    expect(await deckOf()).toMatchObject({ id, title: "Clase 3 v2", notesCount: 2 });
    expect(await storedNotes(id)).toEqual(slides(2));
  });

  it("con otro PDF y su .pptx, cambian las notas", async () => {
    const b = await owner();
    await send(b, "/panel/decks", { file: pdfFile(2), notes: slides(2) });
    const { id } = await deckOf();
    await send(b, `/panel/decks/${id}`, { file: pdfFile(3), notes: slides(3) });
    expect(await deckOf()).toMatchObject({ slideCount: 3, notesCount: 3 });
    expect(await storedNotes(id)).toEqual(slides(3));
  });

  it("un PDF que reemplaza a una html-slides no se queda con las notas del HTML", async () => {
    const b = await owner();
    await send(b, "/panel/decks", { file: new File([htmlSlidesDeck], "charla.html", { type: "text/html" }) });
    const { id } = await deckOf();
    expect(await storedNotes(id)).not.toBeNull();
    await send(b, `/panel/decks/${id}`, { file: pdfFile(3) });
    expect(await deckOf()).toMatchObject({ kind: "pdf", notesCount: null });
    expect(await storedNotes(id)).toBeNull();
  });

  it("un HTML que reemplaza a un PDF deja de tener las notas del .pptx", async () => {
    const b = await owner();
    await send(b, "/panel/decks", { file: pdfFile(2), notes: slides(2) });
    const { id } = await deckOf();
    await send(b, `/panel/decks/${id}`, { file: new File(["<title>Nueva</title>"], "nueva.html", { type: "text/html" }) });
    expect(await deckOf()).toMatchObject({ kind: "generic", notesCount: null });
    expect(await storedNotes(id)).toBeNull();
  });
});

describe("Agregar notas", () => {
  it("guarda las notas de una Presentación en PDF sin cambiar su fecha", async () => {
    const b = await owner();
    await send(b, "/panel/decks", { file: pdfFile(2) });
    const before = await deckOf();
    const response = await send(b, `/panel/decks/${before.id}/notas`, { notes: slides(2) });
    expect(response.headers.get("location")).toBe("/panel?ok=notas");
    expect(await deckOf()).toMatchObject({ notesCount: 2, updatedAt: before.updatedAt });
    expect(await storedNotes(before.id)).toEqual(slides(2));
    expect(await (await b.request("/panel?ok=notas")).text()).toContain("Notas guardadas.");
  });

  it("solo sirve con una Presentación en PDF del Dueño", async () => {
    const b = await owner();
    await send(b, "/panel/decks", { file: new File([htmlSlidesDeck], "charla.html", { type: "text/html" }) });
    const html = await deckOf();
    expect((await send(b, `/panel/decks/${html.id}/notas`, { notes: slides(1) })).headers.get("location")).toBe("/panel?error=no-existe");

    const other = await owner();
    await send(other, "/panel/decks", { file: pdfFile(1) });
    const pdfDeck = await deckOf();
    expect((await send(b, `/panel/decks/${pdfDeck.id}/notas`, { notes: slides(1) })).headers.get("location")).toBe(
      "/panel?error=no-existe",
    );
    expect(await storedNotes(pdfDeck.id)).toBeNull();
  });

  it("pide notas válidas y el origen de la app", async () => {
    const b = await owner();
    await send(b, "/panel/decks", { file: pdfFile(1) });
    const { id } = await deckOf();
    expect((await send(b, `/panel/decks/${id}/notas`)).headers.get("location")).toBe("/panel?error=notas");
    const form = new FormData();
    form.append("notas", JSON.stringify(slides(1)));
    const response = await b.request(`/panel/decks/${id}/notas`, {
      method: "POST",
      body: form,
      headers: { origin: "https://decks.sliding.workers.dev" },
    });
    expect(response.status).toBe(403);
  });
});

describe("parseNotes", () => {
  it("deja texto plano con largo máximo", () => {
    const parsed = parseNotes(JSON.stringify([{ title: "  Uno\n dos  ", notes: "a\r\nb\u0007c\n\n\n\nd" }]));
    expect(parsed).toEqual([{ title: "Uno dos", notes: "a\nb c\n\nd" }]);
    const long = parseNotes(JSON.stringify([{ title: "t".repeat(500), notes: "n".repeat(20_000) }]));
    expect(long).not.toBe("invalidas");
    expect((long as { title: string }[])[0]!.title).toHaveLength(120);
  });

  it("sin nada devuelve null", () => {
    expect(parseNotes(undefined)).toBeNull();
    expect(parseNotes("")).toBeNull();
  });
});
