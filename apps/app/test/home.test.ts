import { exports } from "cloudflare:workers";
import { expect, it } from "vitest";

const get = (path: string) => exports.default.fetch(`https://app.test${path}`);

it("la portada responde, se puede indexar y enlaza la privacidad", async () => {
  const response = await get("/");
  expect(response.status).toBe(200);
  const html = await response.text();
  expect(html).toContain("<title>Sliding</title>");
  expect(html).not.toContain("noindex");
  expect(html).toContain('href="/privacidad"');
});

it("la página de privacidad explica datos, cookies y cómo borrar", async () => {
  const response = await get("/privacidad");
  expect(response.status).toBe(200);
  const html = await response.text();
  for (const heading of ["Qué guardamos", "Cookies", "Cómo borrar tus datos"]) expect(html).toContain(heading);
});
