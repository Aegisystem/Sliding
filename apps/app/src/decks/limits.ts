const MB = 1024 * 1024;

export interface Limits {
  /** Tamaño máximo de un deck. */
  deckBytes: number;
  decksPerOwner: number;
  /** Lo que pueden sumar todos los decks de un Dueño (el plan gratis de KV da 1 GB en total). */
  bytesPerOwner: number;
}

export const LIMITS: Limits = { deckBytes: 20 * MB, decksPerOwner: 20, bytesPerOwner: 50 * MB };
