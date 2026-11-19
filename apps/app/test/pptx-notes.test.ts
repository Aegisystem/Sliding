import { describe, expect, it } from "vitest";
import { PptxError, readPptxNotes } from "../public/pptx-notes.js";

const encoder = new TextEncoder();

async function deflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Un zip mínimo, como el de un .pptx: cada parte comprimida (o guardada tal cual). */
async function zip(files: Record<string, string>, { compress = true } = {}): Promise<Blob> {
  const blobs: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(name);
    const raw = encoder.encode(content);
    const data = compress ? await deflate(raw) : raw;
    const local = new Uint8Array(30 + nameBytes.length);
    const l = new DataView(local.buffer);
    l.setUint32(0, 0x04034b50, true);
    l.setUint16(8, compress ? 8 : 0, true);
    l.setUint32(18, data.length, true);
    l.setUint32(22, raw.length, true);
    l.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    const entry = new Uint8Array(46 + nameBytes.length);
    const c = new DataView(entry.buffer);
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(10, compress ? 8 : 0, true);
    c.setUint32(20, data.length, true);
    c.setUint32(24, raw.length, true);
    c.setUint16(28, nameBytes.length, true);
    c.setUint32(42, offset, true);
    entry.set(nameBytes, 46);
    blobs.push(local, data);
    central.push(entry);
    offset += local.length + data.length;
  }
  const size = central.reduce((n, e) => n + e.length, 0);
  const end = new Uint8Array(22);
  const e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(8, central.length, true);
  e.setUint16(10, central.length, true);
  e.setUint32(12, size, true);
  e.setUint32(16, offset, true);
  return new Blob([...blobs, ...central, end]);
}

const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const rels = (links: [string, string, string][]) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${links
    .map(([id, type, target]) => `<Relationship Id="${id}" Type="${REL}/${type}" Target="${target}"/>`)
    .join("")}</Relationships>`;
const shape = (type: string, body: string) =>
  `<p:sp><p:nvSpPr><p:cNvPr id="2" name="X"/><p:cNvSpPr/><p:nvPr><p:ph type="${type}" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>${body}</p:txBody></p:sp>`;
const slide = (shapes: string, { hidden = false } = {}) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld ${NS}${hidden ? ' show="0"' : ""}><p:cSld><p:spTree><p:nvGrpSpPr/><p:grpSpPr/>${shapes}</p:spTree></p:cSld></p:sld>`;
const notes = (shapes: string) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:notes ${NS}><p:cSld><p:spTree>${shapes}</p:spTree></p:cSld></p:notes>`;

/** Tres diapositivas, guardadas en otro orden que el de la presentación, y una oculta. */
const deck = {
  "[Content_Types].xml": "<Types/>",
  "ppt/presentation.xml": `<?xml version="1.0"?><p:presentation ${NS}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst><p:sldId id="258" r:id="rId4"/><p:sldId id="256" r:id="rId2"/><p:sldId id="257" r:id="rId3"/></p:sldIdLst></p:presentation>`,
  "ppt/_rels/presentation.xml.rels": rels([
    ["rId1", "slideMaster", "slideMasters/slideMaster1.xml"],
    ["rId2", "slide", "slides/slide1.xml"],
    ["rId3", "slide", "slides/slide2.xml"],
    ["rId4", "slide", "/ppt/slides/slide3.xml"],
  ]),
  "ppt/slides/slide3.xml": slide(shape("ctrTitle", "<a:p><a:r><a:t>Portada &amp; más</a:t></a:r></a:p>")),
  "ppt/slides/_rels/slide3.xml.rels": rels([
    ["rId1", "slideLayout", "../slideLayouts/slideLayout1.xml"],
    ["rId2", "notesSlide", "../notesSlides/notesSlide9.xml"],
  ]),
  "ppt/notesSlides/notesSlide9.xml": notes(
    shape("sldImg", "") +
      shape(
        "body",
        '<a:p><a:r><a:rPr lang="es"/><a:t>Hola, </a:t></a:r><a:r><a:t xml:space="preserve">público.</a:t></a:r></a:p><a:p/><a:p><a:r><a:t>Segunda línea</a:t></a:r><a:br/><a:r><a:t/></a:r><a:r><a:t>con salto &#233;</a:t></a:r></a:p>',
      ) +
      shape("sldNum", '<a:p><a:fld id="{1}" type="slidenum"><a:t>1</a:t></a:fld></a:p>'),
  ),
  "ppt/slides/slide1.xml": slide(shape("title", "<a:p><a:r><a:t>Oculta</a:t></a:r></a:p>"), { hidden: true }),
  "ppt/slides/_rels/slide1.xml.rels": rels([["rId2", "notesSlide", "../notesSlides/notesSlide1.xml"]]),
  "ppt/notesSlides/notesSlide1.xml": notes(shape("body", "<a:p><a:r><a:t>Nota secreta</a:t></a:r></a:p>")),
  "ppt/slides/slide2.xml": slide(shape("title", "<a:p><a:r><a:t>Idea </a:t></a:r><a:r><a:t>central</a:t></a:r></a:p>")),
  "ppt/slides/_rels/slide2.xml.rels": rels([["rId1", "slideLayout", "../slideLayouts/slideLayout2.xml"]]),
};

const expected = {
  slides: [
    { title: "Portada & más", notes: "Hola, público.\n\nSegunda línea\ncon salto é" },
    { title: "Idea central", notes: "" },
  ],
  hidden: 1,
};

describe("readPptxNotes", () => {
  it("lee el título y las notas de cada diapositiva visible, en el orden de la presentación", async () => {
    expect(await readPptxNotes(await zip(deck))).toEqual(expected);
  });

  it("también lee partes guardadas sin comprimir", async () => {
    expect(await readPptxNotes(await zip(deck, { compress: false }))).toEqual(expected);
  });

  it("rechaza lo que no es un .pptx", async () => {
    await expect(readPptxNotes(new Blob(["no soy un zip"]))).rejects.toBeInstanceOf(PptxError);
    await expect(readPptxNotes(await zip({ "word/document.xml": "<w:document/>" }))).rejects.toBeInstanceOf(PptxError);
  });
});
