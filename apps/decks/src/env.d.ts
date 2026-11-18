declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    DECKS: KVNamespace;
    /** Origen de la app: el único que puede embeber un deck (ADR 0001). */
    APP_ORIGIN: string;
  }
  interface GlobalProps {
    mainModule: typeof import("./index");
  }
}
