const MB = 1024 * 1024;

export interface Limits {
  /** Tamaño máximo de una presentación: KV no guarda valores de más de 25 MiB. */
  deckBytes: number;
  /** Lo que pueden sumar todas las presentaciones de un Dueño (el plan gratis de KV da 1 GB en total). */
  bytesPerOwner: number;
}

// Solo se limita el peso: cada Dueño sube cuantas presentaciones quiera mientras quepan.
export const LIMITS: Limits = { deckBytes: 20 * MB, bytesPerOwner: 50 * MB };
