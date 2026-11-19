import { en } from "./en";
import { es, type Texts } from "./es";

export type { Texts };

/** Los idiomas de Sliding (#10). Cada uno tiene todos sus textos en un archivo: es.ts y en.ts. */
export const LANGS = ["es", "en"] as const;
export type Lang = (typeof LANGS)[number];

export const TEXTS: Record<Lang, Texts> = { es, en };

export const isLang = (value: unknown): value is Lang => value === "es" || value === "en";

/**
 * El idioma de quien mira: el que eligió con el selector y, si no eligió, el
 * primero de su navegador que Sliding habla. Si el navegador no está en
 * español ni en inglés, inglés.
 */
export function pickLang(chosen: string | null | undefined, acceptLanguage: string | null | undefined): Lang {
  if (isLang(chosen)) return chosen;
  const ranked = (acceptLanguage ?? "")
    .split(",")
    .map((part, order) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { lang: tag.trim().toLowerCase().split("-")[0], q: q ? Number(q.slice(2)) : 1, order };
    })
    .filter((entry) => entry.lang && entry.q > 0)
    .sort((a, b) => b.q - a.q || a.order - b.order);
  return ranked.map((entry) => entry.lang).find(isLang) ?? "en";
}

/** Rellena los {huecos} de un texto: «Subiendo {name}…». */
export const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (hole, key: string) => (key in values ? String(values[key]) : hole));
