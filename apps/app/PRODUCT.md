# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

La persona principal prepara una charla o una clase como deck HTML, muchas veces con la skill html-slides y un agente como Claude, y la presenta en un aula, un evento o una reunión, desde su computador o desde el del lugar. Son docentes, gente que da charlas en meetups o conferencias y estudiantes que exponen. Su trabajo con Sliding tiene dos momentos: antes de la charla, publicar el deck sin desplegar nada; durante la charla, moverlo desde el celular mientras lee sus notas.

Audiencias secundarias confirmadas:
- **Público:** quien mira la Pantalla o abre el Enlace del deck después de la charla. No tiene cuenta.
- **Agentes:** programas como Claude que suben decks en nombre de un Dueño con un token.

## Product Purpose

Sliding aloja decks HTML de un solo archivo para que queden publicados sin que su autor despliegue nada, y convierte el celular del Orador en el Control de la presentación: mueve las slides en la Pantalla y muestra las notas, el cronómetro y la vista previa de la slide siguiente. El éxito es que alguien suba su `index.html`, abra el Enlace para presentar en el computador del lugar, escanee el QR y dé la charla sin pensar en la herramienta.

## Positioning

Sliding no es un editor de slides: el deck ya existe como HTML (hecho a mano, con html-slides o con un agente), y Sliding lo publica tal cual y lo vuelve presentable con el celular. Con los decks de html-slides entiende su estructura: lee las notas del orador y controla cada slide. Cualquier otro HTML se aloja igual y se controla con anterior y siguiente.

## Operating Context

- **Panel del Dueño:** desde un computador, antes de la charla. Sube, reemplaza y borra decks, y copia el Enlace del deck y el Enlace para presentar.
- **Pantalla:** el computador conectado al proyector, a menudo uno ajeno, en un aula o sala con la luz baja. Muestra el deck a pantalla completa y, en la preparación, el QR de control.
- **Control:** el celular del Orador, en la mano, de pie, con poca luz y con apuro. Botones grandes y notas legibles.
- **Agentes:** suben decks por API siguiendo `/llms.txt`, con un token que el Dueño crea en su panel.

## Capabilities and Constraints

- El vocabulario del dominio está en `CONTEXT.md` (raíz del repo): Deck, Slide, Deck html-slides, Deck genérico, Dueño, Enlace del deck, Enlace para presentar, Notas del orador, Agente, Sesión en vivo, Pantalla, Control, QR de control, Orador, Público.
- Para subir hay que iniciar sesión con GitHub o Google; para ver un deck no.
- Un deck es un solo `.html` de hasta 20 MB. Cada Dueño tiene hasta 20 decks y 50 MB en total. Subir de nuevo reemplaza el deck y mantiene su enlace.
- Los decks no están listados: solo los ve quien tiene el enlace. No hay galería.
- Las Notas del orador nunca viajan en el HTML que ve el Público; llegan solo al Control.
- El QR de control sirve una sola vez: el primer celular que lo escanea se vuelve el Control.
- La app vive en `sliding.aegisystem.xyz` y los decks se sirven desde otro sitio (`decks.sliding.workers.dev`).
- Todo cabe en el plan gratis de Cloudflare, sin tarjeta.
- La interfaz va en español y en inglés según el navegador (por construir, #10).
- Fuera de la v1: que el Público siga el deck en su propio celular.

## Brand Commitments

Solo el nombre: **Sliding**. No hay logo, colores ni tono heredados; el mundo visual se elige en la ronda de direcciones.

## Evidence on Hand

- Decks de prueba en `fixtures/` (`html-slides.html`, `generic.html`), escritos para este repo.
- La skill html-slides y su motor (navegación, notas en `<aside class="notes">`, evento `slidechange`).
- No hay usuarios, testimonios, métricas ni prensa. No se deben inventar.

## Product Principles

1. **El deck es del Dueño.** Sliding lo muestra tal cual: no lo edita, no le pone marca encima y no lo indexa.
2. **Presentar sin pensar en la herramienta.** Cada paso del día de la charla (abrir, escanear, avanzar) tiene que salir bien a la primera, con nervios y poca luz.
3. **Las notas son privadas.** Lo que es del Orador nunca llega al Público.
4. **Gratis y simple.** Nada que pida tarjeta, instalar algo o configurar un servidor.

## Accessibility & Inclusion

WCAG 2.2 AA en todo el sitio: contraste, foco visible, uso completo con teclado y lector de pantalla. El Control se usa en el celular, de pie, con poca luz y con apuro: objetivos táctiles grandes y texto legible.
