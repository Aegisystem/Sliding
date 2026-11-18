# Los decks se sirven desde un dominio separado de la app

Los decks son HTML con JavaScript escrito por cualquier Dueño. Si se sirvieran desde el dominio de la app, ese JavaScript podría usar la sesión de quien lo mira y actuar en su nombre. Por eso la app es un Worker en `app.sliding.workers.dev`, los decks se sirven desde un proyecto de Pages en `sliding-decks.pages.dev` y la app los muestra dentro de un iframe. Usamos dos sufijos distintos de la Public Suffix List porque todos los Workers de una cuenta comparten `<cuenta>.workers.dev`, y el navegador los trataría como un solo sitio.

La app va en Workers porque Cloudflare recomienda Workers para proyectos nuevos y la app necesita Durable Objects. El lado de los decks solo sirve archivos, así que le basta Pages, que ya solo recibe mantenimiento.

## Opciones consideradas

- **App en Pages (`htmlslides.pages.dev`) y decks en Workers**: era el plan inicial y da una URL más corta para compartir, pero deja la parte compleja en una plataforma que ya no se recomienda. Descartada.
- **Mismo dominio con `Content-Security-Policy: sandbox`**: deja al deck en un origen opaco, pero rompe `localStorage` y la pantalla completa en decks que los usan, y un solo encabezado mal puesto expone la app. Descartada.
- **Dominio propio con un subdominio por deck**: aísla mejor, pero cuesta dinero y exige DNS comodín. Queda para cuando haya dominio propio.
