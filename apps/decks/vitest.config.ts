import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

// La base de datos es de la app, así que las migraciones vienen de apps/app.
export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(import.meta.dirname, "../app/migrations"));
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: { bindings: { APP_ORIGIN: "https://app.test", TEST_MIGRATIONS: migrations } },
      }),
    ],
    test: { setupFiles: ["./test/apply-migrations.ts"] },
  };
});
