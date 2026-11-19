// Lee las Notas del presentador de un .pptx aquí, en el navegador del Dueño
// (ADR 0004): el archivo nunca se sube, solo el texto de sus notas.
//
// Un .pptx es un zip de XML. Se leen solo las partes que hacen falta, sin
// cargar el archivo entero (sus imágenes pueden pesar cientos de MB):
//   ppt/presentation.xml          el orden de las diapositivas
//   ppt/slides/slideN.xml         su título y si está oculta
//   ppt/notesSlides/notesSlideN.xml   sus notas

/**
 * Un .pptx que no se puede leer. `code` dice por qué ("not-pptx" o
 * "too-many"); app.js lo cuenta en el idioma de la página (#10).
 */
export class PptxError extends Error {
  constructor(code, max) {
    super(code);
    this.code = code;
    this.max = max;
  }
}

const NOT_PPTX = "not-pptx";
const MAX_SLIDES = 1000;

/**
 * Las notas y el título de cada diapositiva visible, en orden. Las ocultas no
 * cuentan: PowerPoint no las exporta al PDF, y las notas se emparejan con las
 * páginas del PDF por número.
 * @param {Blob} file
 * @returns {Promise<{ slides: { title: string, notes: string }[], hidden: number }>}
 */
export async function readPptxNotes(file) {
  const zip = await openZip(file);
  const presentation = await zip.text("ppt/presentation.xml");
  if (presentation === null) throw new PptxError(NOT_PPTX);
  const parts = relationships(await zip.text("ppt/_rels/presentation.xml.rels"), "ppt/presentation.xml");
  const order = [...presentation.matchAll(/<p:sldId\b[^>]*>/g)].map((m) => parts.get(attribute(m[0], "r:id") ?? "")?.target);

  const slides = [];
  let hidden = 0;
  for (const path of order) {
    const slide = path ? await zip.text(path) : null;
    if (slide === null) continue;
    if (/<p:sld\b[^>]*\bshow="(?:0|false)"/.test(slide)) {
      hidden += 1;
      continue;
    }
    if (slides.length >= MAX_SLIDES) throw new PptxError("too-many", MAX_SLIDES);
    const links = relationships(await zip.text(relsOf(path)), path);
    const notesPath = [...links.values()].find((link) => link.type.endsWith("/notesSlide"))?.target;
    const notesXml = notesPath ? await zip.text(notesPath) : null;
    slides.push({
      title: oneLine(placeholderText(slide, ["title", "ctrTitle"])),
      notes: notesXml ? placeholderText(notesXml, ["body"]) : "",
    });
  }
  if (!order.length) throw new PptxError(NOT_PPTX);
  return { slides, hidden };
}

// ── XML de PowerPoint ─────────────────────────────────────────────────────

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const decode = (text) =>
  text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (match, entity) => {
    if (entity[0] !== "#") return ENTITIES[entity.toLowerCase()] ?? match;
    const code = entity[1] === "x" || entity[1] === "X" ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10);
    return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
  });

/** El valor de un atributo dentro de una etiqueta, ya decodificado. */
function attribute(tag, name) {
  const match = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`).exec(tag);
  return match ? decode(match[2] ?? match[3] ?? "") : null;
}

/** Las relaciones de una parte (su archivo .rels): id → { tipo, ruta dentro del zip }. */
function relationships(xml, from) {
  const links = new Map();
  for (const [tag] of (xml ?? "").matchAll(/<Relationship\b[^>]*>/g)) {
    const id = attribute(tag, "Id");
    const target = attribute(tag, "Target");
    if (!id || !target || attribute(tag, "TargetMode") === "External") continue;
    links.set(id, { type: attribute(tag, "Type") ?? "", target: resolve(from, target) });
  }
  return links;
}

/** ppt/slides/slide1.xml → ppt/slides/_rels/slide1.xml.rels */
const relsOf = (path) => path.replace(/([^/]*)$/, "_rels/$1.rels");

/** Una ruta relativa a la carpeta de `from`, o absoluta desde la raíz del zip. */
function resolve(from, target) {
  const parts = target.startsWith("/") ? [] : from.split("/").slice(0, -1);
  for (const piece of target.replace(/^\//, "").split("/")) {
    if (piece === "..") parts.pop();
    else if (piece && piece !== ".") parts.push(piece);
  }
  return parts.join("/");
}

/**
 * El texto de la primera forma cuyo marcador (<p:ph type="…">) sea uno de
 * `types`: un párrafo por línea. En las notas es `body`, que deja fuera el
 * número de diapositiva, la imagen y los encabezados.
 */
function placeholderText(xml, types) {
  for (const [shape] of xml.matchAll(/<p:sp\b[^>]*>[\s\S]*?<\/p:sp>/g)) {
    const placeholder = /<p:ph\b[^>]*>/.exec(shape)?.[0];
    if (!placeholder || !types.includes(attribute(placeholder, "type") ?? "")) continue;
    const body = /<p:txBody\b[^>]*>([\s\S]*?)<\/p:txBody>/.exec(shape)?.[1] ?? "";
    const paragraphs = [...body.matchAll(/<a:p\b[^>]*?(?:\/>|>([\s\S]*?)<\/a:p>)/g)].map(([, inner = ""]) =>
      // Primero <a:t/> vacío: si no, `<a:t\b[^>]*>` lo tomaría como apertura y se comería el run siguiente.
      [...inner.matchAll(/<a:t\b[^>]*\/>|<a:t\b[^>]*>([\s\S]*?)<\/a:t>|<a:br\b[^>]*\/?>/g)]
        .map(([tag, text]) => (tag.startsWith("<a:br") ? "\n" : decode(text ?? "")))
        .join(""),
    );
    return paragraphs
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  return "";
}

const oneLine = (text) => text.replace(/\s+/g, " ").trim();

// ── Zip, leído por partes ─────────────────────────────────────────────────

const u16 = (view, at) => view.getUint16(at, true);
const u32 = (view, at) => view.getUint32(at, true);
const bytesOf = async (file, from, to) => new DataView(await file.slice(from, to).arrayBuffer());

/** El índice del zip (su directorio central), y una forma de leer cada parte como texto. */
async function openZip(file) {
  // El final del directorio central está en los últimos 22 bytes, más un comentario de hasta 64 KB.
  const tailStart = Math.max(0, file.size - (22 + 0xffff));
  const tail = await bytesOf(file, tailStart, file.size);
  let end = -1;
  for (let at = tail.byteLength - 22; at >= 0; at -= 1) {
    if (u32(tail, at) === 0x06054b50) {
      end = at;
      break;
    }
  }
  if (end < 0) throw new PptxError(NOT_PPTX);
  const count = u16(tail, end + 10);
  const size = u32(tail, end + 12);
  const offset = u32(tail, end + 16);
  if (count === 0xffff || size === 0xffffffff || offset === 0xffffffff || offset + size > file.size) {
    throw new PptxError(NOT_PPTX);
  }

  const directory = await bytesOf(file, offset, offset + size);
  const entries = new Map();
  const names = new TextDecoder();
  for (let at = 0, n = 0; n < count && at + 46 <= directory.byteLength; n += 1) {
    if (u32(directory, at) !== 0x02014b50) throw new PptxError(NOT_PPTX);
    const nameLength = u16(directory, at + 28);
    const name = names.decode(new Uint8Array(directory.buffer, directory.byteOffset + at + 46, nameLength));
    entries.set(name, {
      method: u16(directory, at + 10),
      compressed: u32(directory, at + 20),
      local: u32(directory, at + 42),
    });
    at += 46 + nameLength + u16(directory, at + 30) + u16(directory, at + 32);
  }

  const text = new TextDecoder();
  return {
    /** @returns {Promise<string | null>} */
    async text(name) {
      const entry = entries.get(name);
      if (!entry) return null;
      const header = await bytesOf(file, entry.local, entry.local + 30);
      if (u32(header, 0) !== 0x04034b50) throw new PptxError(NOT_PPTX);
      const start = entry.local + 30 + u16(header, 26) + u16(header, 28);
      const data = file.slice(start, start + entry.compressed);
      if (entry.method === 0) return text.decode(await data.arrayBuffer());
      if (entry.method !== 8) throw new PptxError(NOT_PPTX);
      const inflated = data.stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return text.decode(await new Response(inflated).arrayBuffer());
    },
  };
}
