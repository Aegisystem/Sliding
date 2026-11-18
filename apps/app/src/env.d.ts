declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    DECKS: KVNamespace;
    /** Origen desde el que se sirven los decks (ADR 0001). */
    DECKS_ORIGIN: string;
    GITHUB_CLIENT_ID: string;
    GITHUB_CLIENT_SECRET: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    /** Firma las cookies de sesión y de OAuth. */
    SESSION_SECRET: string;
  }
  interface GlobalProps {
    mainModule: typeof import("./index");
  }
}
