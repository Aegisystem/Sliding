import { exports } from "cloudflare:workers";
import { expect, it } from "vitest";

const get = (path: string, init?: RequestInit) => exports.default.fetch(`https://decks.test${path}`, init);

it("pide a los buscadores no indexar nada", async () => {
  const response = await get("/robots.txt");
  expect(response.status).toBe(200);
  expect(await response.text()).toContain("Disallow: /");
});

it("da 404 fuera de /v/<id>", async () => {
  for (const path of ["/", "/v/", "/v/abc/extra", "/otra", "/v/%E0%A4%A"]) {
    expect((await get(path)).status, path).toBe(404);
  }
});

it("solo acepta GET y HEAD", async () => {
  expect((await get("/v/abcdefghijkm", { method: "POST" })).status).toBe(405);
});
