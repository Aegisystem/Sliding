# Sliding

Sitio para subir presentaciones HTML y presentarlas con el celular como Control. El vocabulario está en [CONTEXT.md](CONTEXT.md): usa esos términos en la interfaz, las issues y los commits, y actualiza el archivo cuando un término cambie o aparezca uno nuevo.

## Flujo de trabajo

- **Issues primero.** Todo trabajo vive en una issue de `Aegisystem/Sliding`, con su criterio de "Listo cuando". Antes de tocar código, busca la issue o créala. Si aparece trabajo nuevo, abre otra issue para ese trabajo y deja la actual con su alcance.
- **Trunk-based.** Trabaja sobre `main` con commits pequeños. Cada commit deja los tests en verde y nombra su issue (`refs #12`). El commit que cumple el criterio lleva `Closes #12`.
- **Pasos humanos.** Lo que solo puede hacer el dueño del proyecto (cuentas, secretos, apps de OAuth) va en issues con la etiqueta `needs-human`.
- **Decisiones.** Las decisiones difíciles de revertir van en `docs/adr/`, numeradas, en uno o dos párrafos: contexto, decisión y por qué. Léelas antes de tocar dominios, almacenamiento o el canal del Control.

## Reglas que el código no muestra

- En el código, la Presentación se llama `deck` y la Diapositiva `slide` (tabla `decks`, `deckId`, `slideCount`): son nombres de antes del cambio de vocabulario. En todo texto que lean personas (la interfaz, las issues, los commits) se usan los términos de CONTEXT.md, nunca «deck» ni «slide» en español; en inglés, los de su línea «En inglés» (presentation, slide, remote).
- La interfaz está en español y en inglés (#10). Todo texto que lee una persona vive en `packages/core/src/i18n/es.ts` y `en.ts`, con las mismas llaves; un texto nuevo va en los dos. Las páginas reciben `t` (`c.var.t`) y los scripts del navegador leen sus textos del JSON `#textos` con `say()`.
- El archivo de una presentación (HTML o PDF) se sirve solo desde el origen de las presentaciones (el Worker `decks`) y nunca desde el de la app ([ADR 0001](docs/adr/0001-decks-en-dominio-separado.md)).
- Las Notas del presentador nunca van en el HTML servido. Llegan al Control por la Sesión en vivo.
- Toda consulta que sirve o abre una presentación filtra con `VISIBLE_DECK` de `@sliding/core`: así lo que desactivó el Administrador (o su Dueño desactivado) da 404 en todas partes (#11).
- Una Clave para Agentes existe en claro solo en la respuesta que la crea: Sliding guarda su hash y nunca la escribe en logs, cookies ni URLs (#7).
- La API para Agentes (`/api/v1/`) acepta solo la Clave para Agentes en `Authorization`, nunca la sesión: por eso no pide el mismo origen. Lo que lee un Agente (`/llms.txt` y las respuestas de la API) va solo en inglés, en `apps/app/src/agents/`, y `/llms.txt` cambia junto con la API (#8).
- El `.pptx` nunca se sube: el navegador del Dueño lee sus notas y manda solo ese texto ([ADR 0004](docs/adr/0004-powerpoint-como-pdf-mas-notas.md)).
- Todo cabe en el plan gratis de Cloudflare, sin tarjeta ([ADR 0002](docs/adr/0002-archivos-en-kv.md)).
