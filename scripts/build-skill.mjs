// Arma el texto de la skill html-slides que publica la página /skill:
// un solo Markdown con las instrucciones para la IA y todos los archivos.
//   node scripts/build-skill.mjs
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const skillDir = path.join(root, "skills/html-slides");
const out = path.join(root, "apps/app/public/skill/html-slides.md");

const LANG = { ".md": "markdown", ".html": "html", ".js": "javascript", ".py": "python" };
// SKILL.md primero; después el resto en orden alfabético.
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else files.push(path.relative(skillDir, full));
  }
};
walk(skillDir);
files.sort((a, b) => (a === "SKILL.md" ? -1 : b === "SKILL.md" ? 1 : a.localeCompare(b)));

const header = `# Skill html-slides: presentaciones HTML con tu IA

Esta skill le enseña a tu IA a crear presentaciones de un solo archivo HTML, con ilustraciones animadas y notas para quien presenta. El resultado se sube tal cual a Sliding (https://sliding.aegisystem.xyz) y se presenta con el celular como control.

## Cómo usarla

Pégale todo este texto a tu IA, junto con este pedido:

> Crea la skill «html-slides» con los archivos de abajo, respetando sus rutas, y úsala cuando te pida una presentación.

- **Claude** la guarda como skill y la usa sola cuando le pidas una presentación.
- **Otra IA** puede usar SKILL.md como instrucciones y assets/template.html como punto de partida.

Después pídele, por ejemplo: «Haz una presentación sobre la fotosíntesis para estudiantes de primer año, con notas para mí en cada diapositiva».

## Publicar en Sliding

Cuando la presentación esté lista, no hace falta desplegarla: entra a https://sliding.aegisystem.xyz/panel, sube el archivo .html y toca «Presentar con control». Las notas de cada diapositiva aparecen en tu celular, nunca en la pantalla del público.

---

Los ${files.length} archivos de la skill, cada uno con su ruta:
`;

const body = files
  .map((file) => {
    const text = readFileSync(path.join(skillDir, file), "utf8").replace(/\n+$/, "");
    return `\n## html-slides/${file}\n\n\`\`\`\`\`${LANG[path.extname(file)] ?? ""}\n${text}\n\`\`\`\`\`\n`;
  })
  .join("");

writeFileSync(out, `${header}${body}`);
console.log(`${path.relative(root, out)}: ${files.length} archivos, ${(Buffer.byteLength(header + body) / 1024).toFixed(1)} KB`);
