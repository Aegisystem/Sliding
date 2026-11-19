import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { browser } from "./helpers";

const ORIGIN = "https://app.test";
const get = (path: string, headers: Record<string, string> = {}) => exports.default.fetch(`${ORIGIN}${path}`, { headers });
const langOf = (html: string) => /<html lang="(\w+)">/.exec(html)?.[1];

/** Elegir un idioma con el selector. */
function choose(b: ReturnType<typeof browser>, idioma: string, fields: Record<string, string> = {}, headers: Record<string, string> = {}) {
  const form = new FormData();
  form.append("idioma", idioma);
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  return b.request("/idioma", { method: "POST", body: form, headers: { origin: ORIGIN, ...headers } });
}

describe("el idioma de la interfaz (#10)", () => {
  it("sigue al navegador: español o inglés, e inglés si no es ninguno", async () => {
    const english = await get("/", { "accept-language": "en-US,en;q=0.9" });
    const html = await english.text();
    expect(langOf(html)).toBe("en");
    expect(html).toContain("Sign in with GitHub");
    expect(html).not.toContain("Entrar con GitHub");
    expect(english.headers.get("content-language")).toBe("en");
    expect(english.headers.get("vary")).toContain("Accept-Language");

    expect(langOf(await (await get("/", { "accept-language": "es-MX" })).text())).toBe("es");
    expect(langOf(await (await get("/", { "accept-language": "fr-FR,fr;q=0.9" })).text())).toBe("en");
    expect(langOf(await (await get("/")).text())).toBe("en");
  });

  it("el selector lleva al otro idioma y lo recuerda, aunque el navegador diga otro", async () => {
    const b = browser({ lang: "en-US" });
    const page = await (await b.request("/privacidad")).text();
    expect(page).toContain('<form class="lang-switch" method="post" action="/idioma">');
    expect(page).toMatch(/<button type="submit" name="idioma" value="es" lang="es" aria-label="Ver Sliding en español">/);

    const response = await choose(b, "es", { volver: "/privacidad" });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/privacidad");
    expect(b.setCookies.at(-1)).toMatch(/^__Host-lang=es;.*HttpOnly.*Secure/i);

    const after = await (await b.request("/privacidad")).text();
    expect(langOf(after)).toBe("es");
    expect(after).toContain("Qué guardamos");
    expect(after).toContain('value="en" lang="en" aria-label="Read Sliding in English"');
  });

  it("vuelve solo a páginas de Sliding; si no sabe adónde, a la portada", async () => {
    const b = browser();
    expect((await choose(b, "en", { volver: "https://otro.test/robar" })).headers.get("location")).toBe("/");
    expect((await choose(b, "en", { volver: "//otro.test/robar" })).headers.get("location")).toBe("/");
    expect((await choose(b, "en", { volver: "/panel/f/abc?ok=movido" })).headers.get("location")).toBe("/panel/f/abc?ok=movido");
    // Sin JS no hay `volver`: sirve el Referer de la misma app.
    expect((await choose(b, "en", {}, { referer: `${ORIGIN}/skill` })).headers.get("location")).toBe("/skill");
    expect((await choose(b, "en", {}, { referer: "https://otro.test/" })).headers.get("location")).toBe("/");
  });

  it("no guarda un idioma que no existe ni acepta el pedido desde otro origen", async () => {
    const b = browser();
    await choose(b, "pt", { volver: "/" });
    expect(b.jar.has("__Host-lang")).toBe(false);
    const form = new FormData();
    form.append("idioma", "en");
    const foreign = await b.request("/idioma", { method: "POST", body: form, headers: { origin: "https://otro.test" } });
    expect(foreign.status).toBe(403);
  });

  it("los scripts reciben sus textos en el idioma de la página, sin poder cerrar el <script>", async () => {
    const html = await (await get("/", { "accept-language": "en" })).text();
    const json = /<script type="application\/json" id="textos">(.*?)<\/script>/s.exec(html)?.[1];
    expect(json).toBeDefined();
    expect(json).not.toContain("<");
    expect(JSON.parse(json!)).toMatchObject({ undo: "Undo", copied: "Link copied" });
  });

  it("el panel, el árbol y el Enlace para presentar salen en inglés", async () => {
    const b = browser({ lang: "en" });
    await b.login();
    const form = new FormData();
    form.append("nombre", "Physics");
    await b.request("/panel/carpetas", { method: "POST", body: form, headers: { origin: ORIGIN } });
    const panel = await (await b.request("/panel")).text();
    expect(langOf(panel)).toBe("en");
    for (const text of ["Upload a presentation", "New folder", "Your presentations", '<h2 class="tree-title" id="arbol-titulo">Folders</h2>', "Open folder", "Copy share link"]) {
      expect(panel).toContain(text);
    }
    expect(panel).not.toMatch(/Subir una presentación|Nueva carpeta|Abrir carpeta/);
    const missing = await b.request("/p/no-existe");
    expect(await missing.text()).toContain("Presentation not found");
  });
});
