import { describe, expect, it } from "vitest";
import genericDeck from "../../../fixtures/generic.html?raw";
import htmlSlidesDeck from "../../../fixtures/html-slides.html?raw";
import { detectKind, inspectDeck, stripNotes } from "../src";

describe("detectKind", () => {
  it("reconoce un Deck html-slides", () => {
    expect(detectKind(htmlSlidesDeck)).toBe("html-slides");
  });

  it("trata cualquier otro HTML como Deck genérico", () => {
    expect(detectKind(genericDeck)).toBe("generic");
    expect(detectKind("<section class='slide'>sin motor</section>")).toBe("generic");
    expect(detectKind("<section class='slideshow'></section><script>new CustomEvent('slidechange')</script>")).toBe(
      "generic",
    );
  });

  it("acepta la clase slide junto a otras clases", () => {
    const html = `<section class="big slide dark"></section><script>new CustomEvent("slidechange")</script>`;
    expect(detectKind(html)).toBe("html-slides");
  });
});

describe("stripNotes", () => {
  it("quita todas las Notas del orador y deja las slides", async () => {
    const html = await stripNotes(new Response(htmlSlidesDeck)).text();
    expect(html).not.toContain("Nota 1");
    expect(html).not.toContain("<aside");
    expect(html.match(/<section class="slide">/g)).toHaveLength(3);
    expect(html).toContain("Segunda slide");
  });
});

describe("inspectDeck", () => {
  it("toma como título de cada diapositiva su primer encabezado, aunque esté anidado", async () => {
    const html = `<section class="slide"><p class="big">La clase es <em>el plano</em></p><h2>Después</h2></section>
      <section class="slide"><blockquote><h1>Cita</h1></blockquote></section>
      <script>new CustomEvent('slidechange')</script>`;
    expect((await inspectDeck(html)).slides!.map((s) => s.title)).toEqual(["La clase es el plano", "Cita"]);
  });

  it("lee título, slides y notas de un Deck html-slides", async () => {
    expect(await inspectDeck(htmlSlidesDeck)).toEqual({
      kind: "html-slides",
      title: "Deck de prueba",
      slideCount: 3,
      slides: [
        { title: "Deck de prueba", notes: "Nota 1: saluda y presenta el tema." },
        { title: "Segunda slide", notes: "Nota 2: explica la idea con un ejemplo." },
        { title: "Fin", notes: "Nota 3: abre la ronda de preguntas." },
      ],
    });
  });

  it("en un Deck genérico solo lee el título", async () => {
    expect(await inspectDeck(genericDeck)).toEqual({
      kind: "generic",
      title: "Deck genérico de prueba",
      slideCount: null,
      slides: null,
    });
  });

  it("deja las notas como texto plano, con entidades decodificadas y saltos de línea", async () => {
    const html = `<title> Charla &amp; m&aacute;s </title>
      <section class="slide"><h1>Uno</h1></section>
      <section class="slide"><aside class="notes">
        <p>Primero <strong>esto</strong> &lt;b&gt;</p><p>Después   aquello&#33;</p>
        <ul><li>a</li><li>b</li></ul>
      </aside></section>
      <script>new CustomEvent('slidechange')</script>`;
    const info = await inspectDeck(html);
    expect(info.title).toBe("Charla & más");
    expect(info.slideCount).toBe(2);
    expect(info.slides).toEqual([
      { title: "Uno", notes: "" },
      { title: "", notes: "Primero esto <b>\nDespués aquello!\n\na\nb" },
    ]);
  });

  it("devuelve null si no hay título y lo recorta si es muy largo", async () => {
    expect((await inspectDeck("<p>hola</p>")).title).toBeNull();
    expect((await inspectDeck(`<title>${"x".repeat(500)}</title>`)).title).toHaveLength(200);
  });
});
