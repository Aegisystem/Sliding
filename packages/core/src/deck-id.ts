// Sin caracteres que se confunden al leerlos o dictarlos (0/O, 1/l/I).
const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const DECK_ID_LENGTH = 12;

const PATTERN = new RegExp(`^[${ALPHABET}]{${DECK_ID_LENGTH}}$`);
// El mayor múltiplo de ALPHABET.length que cabe en un byte: los bytes por
// encima se descartan para que cada carácter salga con la misma probabilidad.
const LIMIT = 256 - (256 % ALPHABET.length);

/** Id de deck al azar, imposible de adivinar: el Enlace del deck no está listado. */
export function newDeckId(): string {
  let id = "";
  while (id.length < DECK_ID_LENGTH) {
    for (const byte of crypto.getRandomValues(new Uint8Array(DECK_ID_LENGTH * 2))) {
      if (byte < LIMIT && id.length < DECK_ID_LENGTH) id += ALPHABET[byte % ALPHABET.length];
    }
  }
  return id;
}

export function isDeckId(value: string): boolean {
  return PATTERN.test(value);
}
