# Sliding

Sitio para subir decks HTML y presentarlos con el celular como Control. El vocabulario está en [CONTEXT.md](CONTEXT.md): usa esos términos en el código, las issues y los commits, y actualiza el archivo cuando un término cambie o aparezca uno nuevo.

## Flujo de trabajo

- **Issues primero.** Todo trabajo vive en una issue de `Aegisystem/Sliding`, con su criterio de "Listo cuando". Antes de tocar código, busca la issue o créala. Si aparece trabajo nuevo, abre otra issue para ese trabajo y deja la actual con su alcance.
- **Trunk-based.** Trabaja sobre `main` con commits pequeños. Cada commit deja los tests en verde y nombra su issue (`refs #12`). El commit que cumple el criterio lleva `Closes #12`.
- **Pasos humanos.** Lo que solo puede hacer el dueño del proyecto (cuentas, secretos, apps de OAuth) va en issues con la etiqueta `needs-human`.
- **Decisiones.** Las decisiones difíciles de revertir van en `docs/adr/`, numeradas, en uno o dos párrafos: contexto, decisión y por qué. Léelas antes de tocar dominios, almacenamiento o el canal del Control.

## Reglas que el código no muestra

- El HTML de un deck se sirve solo desde el origen de los decks y nunca desde el de la app ([ADR 0001](docs/adr/0001-decks-en-dominio-separado.md)).
- Las Notas del orador nunca van en el HTML servido. Llegan al Control por la Sesión en vivo.
- Todo cabe en el plan gratis de Cloudflare, sin tarjeta ([ADR 0002](docs/adr/0002-archivos-en-kv.md)).
