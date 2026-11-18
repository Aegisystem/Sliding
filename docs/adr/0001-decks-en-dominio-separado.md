# Los decks se sirven desde un sitio separado de la app

Los decks son HTML con JavaScript escrito por cualquier Dueño. Si se sirvieran desde el mismo sitio que la app, ese JavaScript podría usar la sesión de quien lo mira y actuar en su nombre. Por eso la app es un Worker en `sliding.aegisystem.xyz`, los decks se sirven desde un proyecto de Pages en `sliding-decks.pages.dev` y la app los muestra dentro de un iframe. `pages.dev` está en la Public Suffix List, así que para el navegador cada proyecto de Pages es un sitio aparte.

La app va en Workers porque Cloudflare recomienda Workers para proyectos nuevos y la app necesita Durable Objects. El lado de los decks solo sirve archivos, así que le basta Pages, que ya solo recibe mantenimiento.

## Opciones consideradas

- **Decks en un subdominio de `aegisystem.xyz`** (por ejemplo `decks.aegisystem.xyz`): queda bonito, pero sería el mismo sitio que la app y que todo lo demás bajo `aegisystem.xyz`, así que el JavaScript de un deck podría poner cookies a todos ellos. Descartada.
- **App en `app.sliding.workers.dev`**: no necesita dominio propio, pero era una URL larga. Se cambió por `sliding.aegisystem.xyz`, que no cuesta nada porque el dominio ya usa los DNS de Cloudflare.
- **App en Pages (`htmlslides.pages.dev`) y decks en Workers**: era el plan inicial, pero deja la parte compleja en una plataforma que ya no se recomienda. Descartada.
- **Mismo dominio con `Content-Security-Policy: sandbox`**: deja al deck en un origen opaco, pero rompe `localStorage` y la pantalla completa en decks que los usan, y un solo encabezado mal puesto expone la app. Descartada.
- **Un subdominio por deck bajo otro dominio propio**: aislaría también un deck de otro, pero exige un segundo dominio y DNS comodín. Queda para más adelante.
