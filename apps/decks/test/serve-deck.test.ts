import { env } from "cloudflare:workers";
import { newDeckId } from "@sliding/core";
import { expect, it } from "vitest";
import { serveDeck } from "../src/serve-deck";

it("sirve el HTML guardado en KV", async () => {
  const id = newDeckId();
  await env.DECKS.put(`deck:${id}`, "<!doctype html><title>Hola</title>");
  const response = await serveDeck(id, env);
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
  expect(await response.text()).toContain("<title>Hola</title>");
});

it.each(["no-es-un-id", newDeckId()])("da 404 para %j", async (id) => {
  const response = await serveDeck(id, env);
  expect(response.status).toBe(404);
});
