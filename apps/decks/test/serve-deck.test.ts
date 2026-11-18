import { env } from "cloudflare:workers";
import { type DeckKind, newDeckId } from "@sliding/core";
import { describe, expect, it } from "vitest";
import genericDeck from "../../../fixtures/generic.html?raw";
import htmlSlidesDeck from "../../../fixtures/html-slides.html?raw";
import { serveDeck } from "../src/serve-deck";

async function saveDeck(html: string, kind: DeckKind, { disabled = false } = {}): Promise<string> {
  const id = newDeckId();
  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO decks (id, title, kind, size, disabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(id, "Prueba", kind, html.length, disabled ? 1 : 0, now, now)
    .run();
  await env.DECKS.put(`deck:${id}`, html);
  return id;
}

describe("serveDeck", () => {
  it("sirve un Deck html-slides sin las Notas del orador", async () => {
    const response = await serveDeck(await saveDeck(htmlSlidesDeck, "html-slides"), env);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    const html = await response.text();
    expect(html).toContain("Segunda slide");
    expect(html).not.toContain("Nota 1");
  });

  it("sirve un Deck genérico tal cual", async () => {
    const response = await serveDeck(await saveDeck(genericDeck, "generic"), env);
    expect(await response.text()).toBe(genericDeck);
  });

  it("solo deja que la app lo embeba y pide no indexarlo", async () => {
    const response = await serveDeck(await saveDeck(genericDeck, "generic"), env);
    expect(response.headers.get("content-security-policy")).toBe("frame-ancestors https://app.test");
    expect(response.headers.get("x-robots-tag")).toBe("noindex");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("da 404 si el id no es válido o el deck no existe", async () => {
    expect((await serveDeck("../secreto", env)).status).toBe(404);
    expect((await serveDeck(newDeckId(), env)).status).toBe(404);
  });

  it("da 404 si el deck está desactivado", async () => {
    const id = await saveDeck(genericDeck, "generic", { disabled: true });
    expect((await serveDeck(id, env)).status).toBe(404);
  });

  it("da 404 si falta el archivo en KV", async () => {
    const id = await saveDeck(genericDeck, "generic");
    await env.DECKS.delete(`deck:${id}`);
    expect((await serveDeck(id, env)).status).toBe(404);
  });
});
