/** html-slides y generic son HTML; pdf es una Presentación en PDF (ADR 0004). */
export type DeckKind = "html-slides" | "generic" | "pdf";

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

/** Una diapositiva de una Presentación html-slides, como la ve el Control. */
export interface SlideInfo {
  /** Su primer título (h1, h2, h3, .big o blockquote), o "" si no tiene. */
  title: string;
  /** Sus Notas del presentador, o "" si no tiene. */
  notes: string;
}

export interface DeckInfo {
  kind: DeckKind;
  /** El texto de <title>, o null si no tiene. */
  title: string | null;
  /** Solo en una Presentación html-slides: cuántas diapositivas tiene. */
  slideCount: number | null;
  /**
   * Solo en una Presentación html-slides: título y notas de cada diapositiva,
   * en orden y como texto plano. Nunca HTML: el Control los muestra tal cual.
   */
  slides: SlideInfo[] | null;
}

const SLIDE_TITLES = ["h1", "h2", "h3", ".big", "blockquote"];
const MAX_SLIDE_TITLE = 120;

export async function inspectDeck(html: string): Promise<DeckInfo> {
  const kind = detectKind(html);
  let title = "";
  let titles = 0;
  const slides: SlideInfo[] = [];
  let slide = -1;
  // El título de cada diapositiva es el texto del primer elemento que calce.
  let capturing: string | null = null;
  let titleTaken = false;

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
          slides[slide] = { title: "", notes: "" };
          titleTaken = false;
        },
      })
      // Cada párrafo, salto o ítem de la nota empieza en una línea nueva.
      .on(`${inNotes} p, ${inNotes} br, ${inNotes} li, ${inNotes} div`, {
        element() {
          if (slide >= 0) slides[slide]!.notes += "\n";
        },
      })
      .on(inNotes, {
        text(chunk) {
          if (slide >= 0) slides[slide]!.notes += chunk.text;
        },
      });
    for (const selector of SLIDE_TITLES) {
      rewriter.on(`section.slide ${selector}`, {
        element(element) {
          if (slide < 0 || titleTaken || capturing) return;
          capturing = selector;
          element.onEndTag(() => {
            capturing = null;
            titleTaken = true;
          });
        },
        text(chunk) {
          if (capturing === selector && slide >= 0) slides[slide]!.title += chunk.text;
        },
      });
    }
  }
  await rewriter.transform(new Response(html)).arrayBuffer();

  const cleanTitle = toPlainText(title).replace(/\s+/g, " ").slice(0, MAX_TITLE);
  return {
    kind,
    title: cleanTitle || null,
    slideCount: kind === "html-slides" ? slides.length : null,
    slides:
      kind === "html-slides"
        ? slides.map((s) => ({
            title: toPlainText(s.title).replace(/\s+/g, " ").slice(0, MAX_SLIDE_TITLE),
            notes: toPlainText(s.notes),
          }))
        : null,
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
