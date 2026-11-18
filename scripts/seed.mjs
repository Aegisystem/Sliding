// Carga los decks de fixtures/ en los datos locales que comparten la app y los decks.
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const local = ["--local", "--persist-to", "../../.wrangler/state"];
const decks = [
  { id: "seedDeckA234", file: "fixtures/html-slides.html", kind: "html-slides" },
  { id: "seedDeckB234", file: "fixtures/generic.html", kind: "generic" },
];

const wrangler = (...args) =>
  execFileSync("npx", ["wrangler", ...args], { cwd: path.join(root, "apps/app"), stdio: ["ignore", "ignore", "inherit"] });

wrangler("d1", "migrations", "apply", "DB", ...local);
for (const deck of decks) {
  const file = path.join(root, deck.file);
  const title = readFileSync(file, "utf8").match(/<title>([^<]*)<\/title>/i)?.[1] ?? deck.id;
  const now = Date.now();
  wrangler(
    "d1", "execute", "DB", ...local, "--command",
    `INSERT OR REPLACE INTO decks (id, title, kind, size, disabled, created_at, updated_at)
     VALUES ('${deck.id}', '${title.replaceAll("'", "''")}', '${deck.kind}', ${statSync(file).size}, 0, ${now}, ${now})`,
  );
  wrangler("kv", "key", "put", `deck:${deck.id}`, "--path", file, "--binding", "DECKS", ...local);
  console.log(`${deck.kind.padEnd(12)} http://localhost:8787/d/${deck.id}`);
}
