/**
 * Una Presentación en PDF (ADR 0004). El servidor solo revisa que sea un PDF
 * y trata de contar sus páginas; quien la dibuja es pdf.js, en el origen de
 * las presentaciones.
 */

/** El encabezado `%PDF-` puede venir después de basura, pero dentro del primer KB. */
export function isPdf(bytes: Uint8Array): boolean {
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 1024));
  return head.includes("%PDF-");
}

const PAGES_NODE = /\/Type\s*\/Pages\b/g;
const COUNT = /\/Count\s+(\d+)/;
// Leer un PDF de 20 MB entero toma ~50 ms de CPU, y el plan gratis da 10 por pedido.
const EDGE = 1024 * 1024;
const MAX_PAGES = 10_000;

/**
 * Cuántas páginas tiene: el `/Count` más grande de los nodos `/Type /Pages`,
 * que es la raíz del árbol. Solo mira el primer y el último MB: PowerPoint la
 * escribe al principio, y Keynote y Google Slides al final, sin comprimir. Si
 * no la encuentra (o el PDF la guarda comprimida), devuelve null y el total lo
 * cuenta pdf.js al mostrarla.
 */
export function pdfPageCount(bytes: Uint8Array): number | null {
  const decoder = new TextDecoder("latin1");
  const parts = bytes.length <= 2 * EDGE ? [bytes] : [bytes.subarray(0, EDGE), bytes.subarray(bytes.length - EDGE)];
  let best = 0;
  for (const part of parts) {
    const text = decoder.decode(part);
    for (const match of text.matchAll(PAGES_NODE)) {
      // Solo dentro del mismo objeto: los marcadores (/Outlines) también tienen /Count.
      const from = text.lastIndexOf("obj", match.index);
      const to = text.indexOf("endobj", match.index);
      const object = text.slice(from < 0 ? 0 : from, to < 0 ? text.length : to);
      const count = Number(COUNT.exec(object)?.[1]);
      if (Number.isInteger(count) && count > best && count <= MAX_PAGES) best = count;
    }
  }
  return best || null;
}
