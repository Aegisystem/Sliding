import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

// Pages Functions no se prueban como Worker completo: probamos el código de
// src/ con los mismos bindings que declara wrangler.jsonc.
export default defineConfig({
  plugins: [
    cloudflareTest({
      miniflare: {
        compatibilityDate: "2026-11-01",
        kvNamespaces: ["DECKS"],
        bindings: { APP_ORIGIN: "https://app.test" },
      },
    }),
  ],
});
