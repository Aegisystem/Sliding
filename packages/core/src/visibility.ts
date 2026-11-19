/**
 * La condición SQL de una presentación que se puede ver o presentar: no está
 * desactivada y su Dueño tampoco (#11). La usan la app y el Worker de las
 * presentaciones, así que vive aquí una sola vez. Va en una consulta sobre la
 * tabla `decks` sin alias. Las presentaciones de prueba de `npm run seed` no
 * tienen Dueño y se ven.
 */
export const VISIBLE_DECK =
  "decks.disabled = 0 AND NOT EXISTS (SELECT 1 FROM users WHERE users.id = decks.owner_id AND users.disabled = 1)";
