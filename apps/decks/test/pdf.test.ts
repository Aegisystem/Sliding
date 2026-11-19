import { env, exports } from "cloudflare:workers";
import { newDeckId } from "@sliding/core";
import { describe, expect, it } from "vitest";
import genericDeck from "../../../fixtures/generic.html?raw";
import { PDFJS_PATH } from "../src/pdf-viewer";

const get = (path: string) => exports.default.fetch(`https://decks.test${path}`);
const PDF = "%PDF-1.7\n1 0 obj <</Type/Catalog>> endobj\n%%EOF\n";

async function savePdf({ title = "Clase 3", disabled = false, kind = "pdf", body = PDF } = {}) {
  const id = newDeckId();
  await env.DB.prepare(
    "INSERT INTO decks (id, title, kind, size, disabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1000, 2000)",
  )
    .bind(id, title, kind, body.length, disabled ? 1 : 0)
    .run();
  await env.DECKS.put(`deck:${id}`, body);
  return id;
}

describe("una Presentación en PDF", () => {
  it("habla el idioma que manda la app o, si no, el del navegador (#10)", async () => {
    const id = await savePdf();
    const lang = async (path: string, accept?: string) => {
      const html = await (await exports.default.fetch(`https://decks.test${path}`, accept ? { headers: { "accept-language": accept } } : {})).text();
      return { lang: /<html lang="(\w+)">/.exec(html)?.[1], html };
    };
    const english = await lang(`/v/${id}?lang=en`, "es-CL");
    expect(english.lang).toBe("en");
    expect(english.html).toContain("Loading the presentation…");
    expect(english.html).toContain('data-t-slide="Slide {n} of {total}"');
    expect((await lang(`/v/${id}`, "es-CL,es;q=0.9")).html).toContain("Cargando la presentación…");
    expect((await lang(`/v/${id}`, "fr-FR")).lang).toBe("en");
    expect((await lang(`/v/${id}?previa&lang=es`)).lang).toBe("es");
  });

  it("se abre con el visor de pdf.js, que pide su PDF con la versión", async () => {
    const id = await savePdf();
    const response = await get(`/v/${id}`);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('<script type="module" src="/visor.js"></script>');
    expect(html).toContain(`data-pdf="/v/${id}/pdf?v=2000"`);
    expect(html).toContain(`data-pdfjs="${PDFJS_PATH}"`);
    expect(html).toContain('data-app="https://app.test"');
    expect(PDFJS_PATH).toMatch(/^\/pdfjs\/\d+\.\d+\.\d+\/$/);
  });

  it("no permite scripts en línea y solo la app puede embeberla", async () => {
    const response = await get(`/v/${await savePdf()}`);
    const csp = response.headers.get("content-security-policy")!;
    expect(csp).toContain("script-src 'self' 'wasm-unsafe-eval'");
    expect(csp).not.toContain("unsafe-inline");
    expect(csp).toContain("frame-ancestors https://app.test");
    expect(response.headers.get("x-robots-tag")).toBe("noindex");
    expect(await response.text()).not.toMatch(/<script>|<script data-sliding-bridge>/);
  });

  it("escapa el título", async () => {
    const html = await (await get(`/v/${await savePdf({ title: '<img src=x onerror="alert(1)">' })}`)).text();
    expect(html).toContain("<title>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</title>");
  });

  it("entrega el PDF tal cual, y lo deja guardar un año solo con la versión al día", async () => {
    const id = await savePdf();
    const fresh = await get(`/v/${id}/pdf?v=2000`);
    expect(fresh.status).toBe(200);
    expect(fresh.headers.get("content-type")).toBe("application/pdf");
    expect(fresh.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(fresh.headers.get("cross-origin-resource-policy")).toBe("same-origin");
    expect(await fresh.text()).toBe(PDF);
    expect((await get(`/v/${id}/pdf?v=1`)).headers.get("cache-control")).toBe("no-cache");
    expect((await get(`/v/${id}/pdf`)).headers.get("cache-control")).toBe("no-cache");
  });

  it("da 404 si está desactivada, si no existe o si la presentación es HTML", async () => {
    expect((await get(`/v/${await savePdf({ disabled: true })}`)).status).toBe(404);
    expect((await get(`/v/${await savePdf({ disabled: true })}/pdf?v=2000`)).status).toBe(404);
    expect((await get(`/v/${newDeckId()}/pdf`)).status).toBe(404);
    expect((await get(`/v/${await savePdf({ kind: "generic", body: genericDeck })}/pdf`)).status).toBe(404);
  });
});
