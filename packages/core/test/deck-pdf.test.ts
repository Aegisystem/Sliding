import { describe, expect, it } from "vitest";
import { isPdf, pdfPageCount } from "../src/deck-pdf";

const bytes = (text: string) => new TextEncoder().encode(text);

/** Un PDF mínimo con `pages` páginas y, aparte, un marcador con su propio /Count. */
function pdf(pages: number, { padding = "" } = {}): string {
  const kids = Array.from({ length: pages }, (_, i) => `${i + 10} 0 R`).join(" ");
  const pageObjects = Array.from(
    { length: pages },
    (_, i) => `${i + 10} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 960 540] >>\nendobj\n`,
  ).join("");
  return [
    "%PDF-1.7\n%âãÏÓ\n",
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R /Outlines 3 0 R >>\nendobj\n",
    "3 0 obj\n<< /Type /Outlines /Count 99 >>\nendobj\n",
    padding,
    pageObjects,
    `2 0 obj\n<</Type/Pages/Kids[${kids}]/Count ${pages}>>\nendobj\n`,
    "trailer\n<< /Root 1 0 R >>\n%%EOF\n",
  ].join("");
}

describe("isPdf", () => {
  it("reconoce el encabezado %PDF-, aunque venga después de algo de basura", () => {
    expect(isPdf(bytes(pdf(1)))).toBe(true);
    expect(isPdf(bytes(`${" ".repeat(500)}${pdf(1)}`))).toBe(true);
  });

  it("rechaza lo que no es un PDF", () => {
    expect(isPdf(bytes("<!doctype html><title>x</title>"))).toBe(false);
    expect(isPdf(bytes(`${" ".repeat(2000)}%PDF-1.7`))).toBe(false);
    expect(isPdf(new Uint8Array())).toBe(false);
  });
});

describe("pdfPageCount", () => {
  it("cuenta las páginas con el /Count de la raíz, no el de los marcadores", () => {
    expect(pdfPageCount(bytes(pdf(1)))).toBe(1);
    expect(pdfPageCount(bytes(pdf(12)))).toBe(12);
  });

  it("con un árbol de páginas anidado, se queda con la raíz", () => {
    const nested = [
      "%PDF-1.4\n",
      "2 0 obj << /Type /Pages /Kids [4 0 R 5 0 R] /Count 5 >> endobj\n",
      "4 0 obj << /Type /Pages /Parent 2 0 R /Kids [6 0 R 7 0 R] /Count 2 >> endobj\n",
      "5 0 obj << /Type /Pages /Parent 2 0 R /Kids [8 0 R 9 0 R 10 0 R] /Count 3 >> endobj\n",
    ].join("");
    expect(pdfPageCount(bytes(nested))).toBe(5);
  });

  it("encuentra la raíz al principio o al final de un PDF grande", () => {
    const padding = "x".repeat(9 * 1024 * 1024);
    expect(pdfPageCount(bytes(pdf(3, { padding })))).toBe(3);
    expect(pdfPageCount(bytes(`%PDF-1.7\n2 0 obj <</Type/Pages/Count 4/Kids[]>> endobj\n${padding}%%EOF`))).toBe(4);
  });

  it("no lee el medio de un PDF grande: ahí devuelve null", () => {
    const padding = "x".repeat(3 * 1024 * 1024);
    expect(pdfPageCount(bytes(`%PDF-1.7\n${padding}2 0 obj <</Type/Pages/Count 4/Kids[]>> endobj\n${padding}%%EOF`))).toBeNull();
  });

  it("devuelve null si el árbol de páginas está comprimido", () => {
    expect(pdfPageCount(bytes("%PDF-1.5\n1 0 obj << /Type /ObjStm /N 4 /First 20 /Filter /FlateDecode >> stream\nxyz\nendstream endobj\n"))).toBeNull();
  });
});
