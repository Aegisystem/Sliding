// Sin caracteres que se confunden al leerlos o dictarlos (0/O, 1/l/I).
const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const DECK_ID_LENGTH = 12;

const PATTERN = new RegExp(`^[${ALPHABET}]{${DECK_ID_LENGTH}}$`);
// El mayor múltiplo de ALPHABET.length que cabe en un byte: los bytes por
// encima se descartan para que cada carácter salga con la misma probabilidad.
const LIMIT = 256 - (256 % ALPHABET.length);

/** Texto al azar de ese largo, imposible de adivinar, con letras y números fáciles de leer. */
export function randomText(length: number): string {
  let text = "";
  while (text.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length * 2))) {
      if (byte < LIMIT && text.length < length) text += ALPHABET[byte % ALPHABET.length];
    }
  }
  return text;
}

/** Id de deck al azar, imposible de adivinar: el Enlace del deck no está listado. */
export function newDeckId(): string {
  return randomText(DECK_ID_LENGTH);
}

export function isDeckId(value: string): boolean {
  return PATTERN.test(value);
}
