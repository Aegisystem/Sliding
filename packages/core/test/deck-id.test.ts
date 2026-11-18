import { describe, expect, it } from "vitest";
import { DECK_ID_LENGTH, isDeckId, newDeckId } from "../src";

describe("newDeckId", () => {
  it("genera ids válidos y distintos", () => {
    const ids = new Set(Array.from({ length: 1000 }, newDeckId));
    expect(ids.size).toBe(1000);
    for (const id of ids) {
      expect(id).toHaveLength(DECK_ID_LENGTH);
      expect(isDeckId(id)).toBe(true);
    }
  });
});

describe("isDeckId", () => {
  it.each(["", "abc", "abcdefghijk0", "abcdefghijkl/", "../etc/passwd", "abcdefghijklm"])(
    "rechaza %j",
    (value) => expect(isDeckId(value)).toBe(false),
  );
});
