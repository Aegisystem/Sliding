# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

La persona principal prepara una charla o una clase como presentación HTML, muchas veces con la skill html-slides y un agente como Claude, y la presenta en un aula, un evento o una reunión, desde su computador o desde el del lugar. Son docentes, gente que da charlas en meetups o conferencias y estudiantes que exponen. Su trabajo con Sliding tiene dos momentos: antes de la charla, publicar la presentación sin desplegar nada; durante la charla, moverla desde el celular mientras lee sus notas.

Audiencias secundarias confirmadas:
- **Público:** quien mira la Pantalla o abre el Enlace de la presentación después de la charla. No tiene cuenta.
- **Agentes:** programas como Claude que suben presentaciones en nombre de un Dueño con un token.

## Product Purpose

Sliding aloja presentaciones HTML de un solo archivo para que queden publicadas sin que su autor despliegue nada, y convierte el celular del Presentador en el Control: mueve las diapositivas en la Pantalla y muestra las notas, el cronómetro y la vista previa de la diapositiva siguiente. El éxito es que alguien suba su `index.html`, abra el Enlace para presentar en el computador del lugar, escanee el QR y dé la charla sin pensar en la herramienta.

## Positioning

Sliding no es un editor de diapositivas: la presentación ya existe como HTML (hecha a mano, con html-slides o con un agente), y Sliding la publica tal cual y la vuelve presentable con el celular. Con las presentaciones de html-slides entiende su estructura: lee las notas del presentador y controla cada diapositiva. Cualquier otro HTML se aloja igual y se controla con anterior y siguiente.

## Operating Context

- **Panel del Dueño:** desde un computador, antes de la charla. Sube, reemplaza y borra presentaciones, y copia el Enlace de la presentación y el Enlace para presentar.
- **Pantalla:** el computador conectado al proyector, a menudo uno ajeno, en un aula o sala con la luz baja. Muestra la presentación a pantalla completa y, en la preparación, el QR de control.
- **Control:** el celular del Presentador, en la mano, de pie, con poca luz y con apuro. Botones grandes y notas legibles.
- **Agentes:** suben presentaciones por API siguiendo `/llms.txt`, con un token que el Dueño crea en su panel.

## Capabilities and Constraints

- El vocabulario del dominio está en `CONTEXT.md` (raíz del repo): Presentación, Diapositiva, Presentación html-slides, Presentación genérica, Dueño, Enlace de la presentación, Enlace para presentar, Notas del presentador, Agente, Sesión en vivo, Pantalla, Control, QR de control, Presentador, Público. En el código, la Presentación se llama `deck`.
- Para subir hay que iniciar sesión con GitHub o Google; para ver una presentación no.
- Una presentación es un solo `.html` de hasta 20 MB. Cada Dueño tiene hasta 20 presentaciones y 50 MB en total. Subir de nuevo reemplaza la presentación y mantiene su enlace.
- Las presentaciones no están listadas: solo las ve quien tiene el enlace. No hay galería.
- Las Notas del presentador nunca viajan en el HTML que ve el Público; llegan solo al Control.
- El QR de control sirve una sola vez: el primer celular que lo escanea se vuelve el Control.
- La app vive en `sliding.aegisystem.xyz` y las presentaciones se sirven desde otro sitio (`decks.sliding.workers.dev`).
- Todo cabe en el plan gratis de Cloudflare, sin tarjeta.
- La interfaz va en español y en inglés según el navegador (por construir, #10).
- Fuera de la v1: que el Público siga la presentación en su propio celular.

## Brand Commitments

Solo el nombre: **Sliding**. No hay logo, colores ni tono heredados; el mundo visual se elige en la ronda de direcciones.

## Evidence on Hand

- Presentaciones de prueba en `fixtures/` (`html-slides.html`, `generic.html`), escritos para este repo.
- La skill html-slides y su motor (navegación, notas en `<aside class="notes">`, evento `slidechange`).
- No hay usuarios, testimonios, métricas ni prensa. No se deben inventar.

## Product Principles

1. **La presentación es del Dueño.** Sliding la muestra tal cual: no la edita, no le pone marca encima y no la indexa.
2. **Presentar sin pensar en la herramienta.** Cada paso del día de la charla (abrir, escanear, avanzar) tiene que salir bien a la primera, con nervios y poca luz.
3. **Las notas son privadas.** Lo que es del Presentador nunca llega al Público.
4. **Gratis y simple.** Nada que pida tarjeta, instalar algo o configurar un servidor.

## Accessibility & Inclusion

WCAG 2.2 AA en todo el sitio: contraste, foco visible, uso completo con teclado y lector de pantalla. El Control se usa en el celular, de pie, con poca luz y con apuro: objetivos táctiles grandes y texto legible.
