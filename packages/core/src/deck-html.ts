export type DeckKind = "html-slides" | "generic";

// Un Deck html-slides tiene slides en <section class="slide"> y el motor que
// avisa cada cambio con el evento `slidechange`.
const SLIDE_SECTION = /<section\b[^>]*\bclass\s*=\s*["'](?:[^"']*\s)?slide(?:\s[^"']*)?["']/i;
const ENGINE_EVENT = /new\s+CustomEvent\(\s*["']slidechange["']/;

export function detectKind(html: string): DeckKind {
  return SLIDE_SECTION.test(html) && ENGINE_EVENT.test(html) ? "html-slides" : "generic";
}

/**
 * Quita las Notas del orador de un Deck html-slides. Las notas llegan al
 * Control por la Sesión en vivo, nunca en el HTML servido.
 */
export function stripNotes(response: Response): Response {
  return new HTMLRewriter()
    .on("aside.notes", {
      element(element) {
        element.remove();
      },
    })
    .transform(response);
}
