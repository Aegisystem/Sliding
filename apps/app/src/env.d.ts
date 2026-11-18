declare namespace Cloudflare {
  interface Env {
    DECKS: KVNamespace;
    /** Origen desde el que se sirven los decks (ADR 0001). */
    DECKS_ORIGIN: string;
  }
  interface GlobalProps {
    mainModule: typeof import("./index");
  }
}
