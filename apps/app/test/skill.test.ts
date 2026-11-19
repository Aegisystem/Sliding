import { exports } from "cloudflare:workers";
import { expect, it } from "vitest";
import bundle from "../public/skill/html-slides.md?raw";
import template from "../../../skills/html-slides/assets/template.html?raw";
import skill from "../../../skills/html-slides/SKILL.md?raw";

it("la página de la skill explica los pasos y ofrece copiar y descargar", async () => {
  const response = await exports.default.fetch("https://app.test/skill", { headers: { "accept-language": "es" } });
  expect(response.status).toBe(200);
  const html = await response.text();
  expect(html).toContain("data-copy-skill");
  expect(html).toContain('href="/skill/html-slides.md"');
  expect(html).toContain("Crea la skill html-slides con estos archivos");
});

it("el texto publicado está al día con los archivos de la skill (npm run build:skill)", () => {
  expect(bundle).toContain(skill.trimEnd());
  expect(bundle).toContain(template.trimEnd());
  expect(bundle).toContain("## html-slides/references/drawings.md");
  expect(bundle).toContain("https://sliding.aegisystem.xyz/panel");
});
