// Copia pdf.js de node_modules a public/pdfjs/<versión>/, donde lo sirve este
// Worker como archivos estáticos (ADR 0004). La versión va en la ruta para que
// el navegador pueda guardarlos sin preguntar: al subir de versión, cambia la ruta.
// Corre antes de `wrangler dev`, de `wrangler deploy` y de los tests.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const source = path.dirname(require.resolve("pdfjs-dist/package.json"));
const { version } = JSON.parse(readFileSync(path.join(source, "package.json"), "utf8"));
const out = path.join(import.meta.dirname, "../public/pdfjs");
const target = path.join(out, version);

if (!existsSync(path.join(target, "pdf.worker.min.mjs"))) {
  rmSync(out, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  // La versión «legacy»: la moderna pide funciones muy nuevas (Math.sumPrecise,
  // Uint8Array.fromBase64) y el computador de un auditorio suele tener un navegador viejo.
  for (const file of ["legacy/build/pdf.min.mjs", "legacy/build/pdf.worker.min.mjs", "LICENSE"]) {
    cpSync(path.join(source, file), path.join(target, path.basename(file)));
  }
  // Mapas de caracteres, las 14 fuentes estándar, decodificadores en wasm y el perfil de color CMYK.
  for (const dir of ["cmaps", "standard_fonts", "wasm", "iccs"]) {
    cpSync(path.join(source, dir), path.join(target, dir), { recursive: true });
  }
  console.log(`pdf.js ${version} copiado a public/pdfjs/${version}/`);
}
