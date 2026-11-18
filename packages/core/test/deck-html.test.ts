import { describe, expect, it } from "vitest";
import genericDeck from "../../../fixtures/generic.html?raw";
import htmlSlidesDeck from "../../../fixtures/html-slides.html?raw";
import { detectKind, stripNotes } from "../src";

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
