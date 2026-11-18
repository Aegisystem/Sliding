import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(import.meta.dirname, "migrations"));
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            // Valores falsos: los tests no salen a GitHub ni a Google.
            SESSION_SECRET: "secreto-de-prueba",
            GITHUB_CLIENT_ID: "github-id",
            GITHUB_CLIENT_SECRET: "github-secret",
            GOOGLE_CLIENT_ID: "google-id",
            GOOGLE_CLIENT_SECRET: "google-secret",
          },
        },
      }),
    ],
    test: { setupFiles: ["./test/apply-migrations.ts"] },
  };
});
