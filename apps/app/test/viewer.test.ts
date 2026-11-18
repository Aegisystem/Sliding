import { env, exports } from "cloudflare:workers";
import { newDeckId } from "@sliding/core";
import { describe, expect, it } from "vitest";

async function saveDeck(title: string, { disabled = false } = {}): Promise<string> {
  const id = newDeckId();
  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO decks (id, title, kind, size, disabled, created_at, updated_at) VALUES (?, ?, 'generic', 1, ?, ?, ?)",
  )
    .bind(id, title, disabled ? 1 : 0, now, now)
    .run();
  return id;
}

const get = (path: string) => exports.default.fetch(`https://app.test${path}`);

describe("Enlace de la presentación", () => {
  it("muestra el deck en un iframe servido desde el origen de los decks", async () => {
    const id = await saveDeck("Mi charla");
    const response = await get(`/d/${id}`);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain(`<iframe\n    src="${env.DECKS_ORIGIN}/v/${id}"`);
    expect(html).toContain("<title>Mi charla · Sliding</title>");
  });

  it("escapa el título del deck", async () => {
    const id = await saveDeck(`<script>alert("x")</script>`);
    const html = await (await get(`/d/${id}`)).text();
    expect(html).not.toContain(`<script>alert`);
    expect(html).toContain("&lt;script&gt;");
  });

  it("da 404 si el deck no existe, está desactivado o el id no es válido", async () => {
    const disabled = await saveDeck("Oculto", { disabled: true });
    for (const path of [`/d/${newDeckId()}`, `/d/${disabled}`, "/d/no-es-un-id"]) {
      const response = await get(path);
      expect(response.status, path).toBe(404);
      expect(await response.text()).toContain("Presentación no encontrada");
    }
  });
});
