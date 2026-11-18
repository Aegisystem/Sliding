import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

// Pages Functions no se prueban como Worker completo: probamos el código de
// src/ con los mismos bindings que declara wrangler.jsonc. La base de datos
// es de la app, así que las migraciones vienen de apps/app.
export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(import.meta.dirname, "../app/migrations"));
  return {
    plugins: [
      cloudflareTest({
        miniflare: {
          compatibilityDate: "2026-11-01",
          kvNamespaces: ["DECKS"],
          d1Databases: ["DB"],
          bindings: { APP_ORIGIN: "https://app.test", TEST_MIGRATIONS: migrations },
        },
      }),
    ],
    test: { setupFiles: ["./test/apply-migrations.ts"] },
  };
});
