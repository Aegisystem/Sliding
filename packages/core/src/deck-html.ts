export type DeckKind = "html-slides" | "generic";

// Un Deck html-slides tiene slides en <section class="slide"> y el motor que
// avisa cada cambio con el evento `slidechange`.
const SLIDE_SECTION = /<section\b[^>]*\bclass\s*=\s*["'](?:[^"']*\s)?slide(?:\s[^"']*)?["']/i;
const ENGINE_EVENT = /new\s+CustomEvent\(\s*["']slidechange["']/;
const MAX_TITLE = 200;

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

export interface DeckInfo {
  kind: DeckKind;
  /** El texto de <title>, o null si no tiene. */
  title: string | null;
  /** Solo en un Deck html-slides: cuántas slides tiene. */
  slideCount: number | null;
  /**
   * Solo en un Deck html-slides: la nota de cada slide, en orden, como texto
   * plano ("" si esa slide no tiene). Nunca HTML: el Control la muestra tal cual.
   */
  notes: string[] | null;
}

export async function inspectDeck(html: string): Promise<DeckInfo> {
  const kind = detectKind(html);
  let title = "";
  let titles = 0;
  const notes: string[] = [];
  let slide = -1;

  const rewriter = new HTMLRewriter().on("title", {
    element() {
      titles += 1;
    },
    text(chunk) {
      if (titles === 1) title += chunk.text;
    },
  });
  if (kind === "html-slides") {
    const inNotes = "section.slide aside.notes";
    rewriter
      .on("section.slide", {
        element() {
          slide += 1;
          notes[slide] = "";
        },
      })
      // Cada párrafo, salto o ítem de la nota empieza en una línea nueva.
      .on(`${inNotes} p, ${inNotes} br, ${inNotes} li, ${inNotes} div`, {
        element() {
          if (slide >= 0) notes[slide] += "\n";
        },
      })
      .on(inNotes, {
        text(chunk) {
          if (slide >= 0) notes[slide] += chunk.text;
        },
      });
  }
  await rewriter.transform(new Response(html)).arrayBuffer();

  const cleanTitle = toPlainText(title).replace(/\s+/g, " ").slice(0, MAX_TITLE);
  return {
    kind,
    title: cleanTitle || null,
    slideCount: kind === "html-slides" ? notes.length : null,
    notes: kind === "html-slides" ? notes.map(toPlainText) : null,
  };
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ", uuml: "ü",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", Ntilde: "Ñ", Uuml: "Ü",
  iquest: "¿", iexcl: "¡", laquo: "«", raquo: "»", hellip: "…", mdash: "—", ndash: "–",
  ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", middot: "·", rarr: "→", larr: "←",
};

/** HTMLRewriter entrega el texto con las entidades sin decodificar. */
function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith("#")) {
      const code = entity[1] === "x" || entity[1] === "X" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity] ?? match;
  });
}

function toPlainText(raw: string): string {
  return decodeEntities(raw)
    .replace(/ /g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t\r\f\v]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
