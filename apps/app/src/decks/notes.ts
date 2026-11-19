import type { SlideInfo } from "@sliding/core";

// El texto de las notas de una charla larga cabe de sobra en esto.
const MAX_FIELD = 512 * 1024;
const MAX_SLIDES = 1000;
const MAX_TITLE = 120;
const MAX_NOTES = 10_000;

/**
 * Las notas de una Presentación en PDF, como las manda el navegador del Dueño
 * después de leer su .pptx (ADR 0004): `[{ title, notes }]`, una por diapositiva
 * visible. Devuelve null si no vino nada y "invalidas" si no tienen esa forma.
 */
export function parseNotes(raw: unknown): SlideInfo[] | null | "invalidas" {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string" || raw.length > MAX_FIELD) return "invalidas";
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return "invalidas";
  }
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_SLIDES) return "invalidas";
  const slides: SlideInfo[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return "invalidas";
    const { title, notes } = item as Record<string, unknown>;
    if (typeof title !== "string" || typeof notes !== "string") return "invalidas";
    slides.push({ title: clean(title, MAX_TITLE).replace(/\s+/g, " "), notes: clean(notes, MAX_NOTES) });
  }
  return slides;
}

/** Texto plano: sin caracteres de control (menos el salto de línea) y con un largo máximo. */
const clean = (text: string, max: number) =>
  text
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ")
    .split("\n")
    .map((line) => line.replace(/ {2,}/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
