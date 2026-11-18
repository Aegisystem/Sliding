declare namespace Cloudflare {
  interface Env {
    DECKS: KVNamespace;
    /** Origen de la app: el único que puede embeber un deck (ADR 0001). */
    APP_ORIGIN: string;
  }
}
