import { exports } from "cloudflare:workers";
import { expect, it } from "vitest";

it("la portada responde", async () => {
  const response = await exports.default.fetch("https://app.test/");
  expect(response.status).toBe(200);
  expect(await response.text()).toContain("<title>Sliding</title>");
});
