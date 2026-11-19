import { describe, expect, it } from "vitest";
import { TEXTS, fill, pickLang } from "../src";

describe("el idioma de quien mira (#10)", () => {
  it("usa el idioma elegido antes que el del navegador", () => {
    expect(pickLang("es", "en-US,en;q=0.9")).toBe("es");
    expect(pickLang("en", "es-CL")).toBe("en");
  });

  it("si no eligió, usa el primero del navegador que Sliding habla", () => {
    expect(pickLang(null, "es-CL,es;q=0.9,en;q=0.8")).toBe("es");
    expect(pickLang(undefined, "en-GB")).toBe("en");
    expect(pickLang(null, "fr-FR,fr;q=0.9,es;q=0.5")).toBe("es");
    expect(pickLang(null, "de;q=0.9,en;q=0.2,es;q=0.4")).toBe("es");
  });

  it("si el navegador no está en español ni en inglés, o no dice nada, usa inglés", () => {
    expect(pickLang(null, "fr-FR,de;q=0.8")).toBe("en");
    expect(pickLang(null, "")).toBe("en");
    expect(pickLang(null, null)).toBe("en");
    expect(pickLang("pt", "*")).toBe("en");
  });

  it("no toma un idioma con q=0", () => {
    expect(pickLang(null, "es;q=0, en")).toBe("en");
  });
});

/** Las llaves de un objeto de textos, a cualquier profundidad: «panel.ok.subido». */
function keys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, inner]) => keys(inner, prefix ? `${prefix}.${key}` : key));
}

describe("los textos (#10)", () => {
  it("español e inglés tienen las mismas llaves, con listas del mismo largo", () => {
    expect(keys(TEXTS.en).sort()).toEqual(keys(TEXTS.es).sort());
    expect(TEXTS.en.skill.steps).toHaveLength(TEXTS.es.skill.steps.length);
    expect(TEXTS.en.privacy.what).toHaveLength(TEXTS.es.privacy.what.length);
  });

  it("los textos del navegador tienen los mismos huecos en los dos idiomas", () => {
    const holes = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const [key, text] of Object.entries(TEXTS.es.client)) {
      expect(holes(TEXTS.en.client[key as keyof typeof TEXTS.en.client]), key).toEqual(holes(text));
    }
  });

  it("rellena los huecos y deja los que no conoce", () => {
    expect(fill("Subiendo {name}…", { name: "clase.pdf" })).toBe("Subiendo clase.pdf…");
    expect(fill("Carpeta · {n} {unit} dentro", { unit: "carpetas" })).toBe("Carpeta · {n} carpetas dentro");
  });
});
