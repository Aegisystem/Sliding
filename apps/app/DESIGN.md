---
name: Sliding
description: Tus presentaciones HTML, desde el celular. El programa impreso de un congreso.
colors:
  paper: "#ffffff"
  ink: "#111318"
  ink-soft: "#5b6170"
  azul: "#1f4bd8"
  naranja: "#ff6a13"
  verde: "#12a574"
  amarillo: "#ffd23f"
typography:
  display:
    fontFamily: "Archivo, Arial Narrow, sans-serif"
    fontSize: "clamp(6.5rem, 19vw, 17rem)"
    fontWeight: 800
    lineHeight: 0.8
    letterSpacing: "-0.04em"
    fontVariation: "\"wdth\" 62"
  headline:
    fontFamily: "Archivo, Arial Narrow, sans-serif"
    fontSize: "clamp(3.5rem, 9vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.85
    letterSpacing: "-0.02em"
    fontVariation: "\"wdth\" 62"
  title:
    fontFamily: "Archivo, Arial Narrow, sans-serif"
    fontSize: "clamp(2.25rem, 3.6vw, 3.25rem)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.02em"
    fontVariation: "\"wdth\" 62"
  title-small:
    fontFamily: "Archivo, Arial Narrow, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.1
    fontVariation: "\"wdth\" 62"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.55
  notes:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.45
  body-small:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
  control:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 700
    lineHeight: 1.1
    fontVariation: "\"wdth\" 80"
  label:
    fontFamily: "Archivo, Arial Narrow, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 800
    letterSpacing: "0.04em"
    fontVariation: "\"wdth\" 62"
  numeral:
    fontFamily: "Archivo, Arial Narrow, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "\"tnum\", \"lnum\""
    fontVariation: "\"wdth\" 62"
rounded:
  stamp: "6px"
  control: "10px"
  badge: "16px"
  round: "50%"
spacing:
  gutter: "clamp(1rem, 3vw, 2.5rem)"
  head: "3rem"
  section: "clamp(3rem, 7vw, 6rem)"
components:
  button:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0.7rem 1.1rem"
    height: "3rem"
  button-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0.7rem 1.1rem"
    height: "3rem"
  button-ink-hover:
    backgroundColor: "{colors.azul}"
    textColor: "{colors.paper}"
  button-small:
    rounded: "{rounded.control}"
    padding: "0.45rem 0.8rem"
    height: "2.5rem"
  button-danger-hover:
    backgroundColor: "{colors.naranja}"
    textColor: "{colors.ink}"
  button-copied:
    backgroundColor: "{colors.verde}"
    textColor: "{colors.ink}"
  button-disabled:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-soft}"
  running-head:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    padding: "0 clamp(1rem, 3vw, 2.5rem)"
    height: "3rem"
  track-azul:
    backgroundColor: "{colors.azul}"
    textColor: "{colors.paper}"
  track-naranja:
    backgroundColor: "{colors.naranja}"
    textColor: "{colors.ink}"
  track-verde:
    backgroundColor: "{colors.verde}"
    textColor: "{colors.ink}"
  track-amarillo:
    backgroundColor: "{colors.amarillo}"
    textColor: "{colors.ink}"
  badge:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.badge}"
    padding: "2.25rem 1.5rem 0"
  badge-role:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.amarillo}"
    typography: "{typography.title-small}"
    padding: "0.75rem 1.5rem"
  lanyard:
    backgroundColor: "{colors.amarillo}"
    width: "3rem"
  stamp:
    typography: "{typography.label}"
    rounded: "{rounded.stamp}"
    padding: "0.35rem 0.7rem"
  flash-ok:
    backgroundColor: "{colors.amarillo}"
    textColor: "{colors.ink}"
    padding: "0.9rem 1.1rem"
  flash-error:
    backgroundColor: "{colors.naranja}"
    textColor: "{colors.ink}"
    padding: "0.9rem 1.1rem"
  upload-dragging:
    backgroundColor: "{colors.amarillo}"
    rounded: "{rounded.control}"
    padding: "1rem"
---

# Design System: Sliding

## Overview

**Creative North Star: "Programa de congreso"**

Sliding se ve como el programa impreso de un congreso con su credencial colgada de la cinta. Cartulina blanca, tinta negra y cuatro pistas de color que ocupan regiones enteras de la página, nunca detalles sueltos. Cada presentación es una sesión del programa: tiene su código (cuántas diapositivas, o «HTML genérica»), su título y lo que se hace con ella: presentarla con control, verla o compartirla. La información vive en hileras entre reglas negras de 2px, como las tablas del final de un programa.

La densidad es de impreso, no de aplicación: títulos condensados muy grandes, texto corrido de ancho normal, cifras tabulares, y casi ningún adorno que no exista en papel. El único objeto con volumen es la credencial plastificada, que cuelga de una cinta amarilla, se balancea una vez al cargar y se asienta. Es el control para entrar y, ya dentro, la identidad del Dueño en el panel.

El mundo rechaza la landing SaaS de titular, degradado y maqueta de laptop con celular. Y se detiene en la puerta de la presentación: la página del Enlace de la presentación (`/d/<id>`) no lleva nada de Sliding, porque la presentación es del Dueño.

**Key Characteristics:**
- Cartulina blanca y tinta negra; el color llega como campos de página, no como texto.
- Cuatro pistas (azul, naranja, verde, amarillo), cada una con su tinta de texto medida.
- Archivo variable: condensada al 62% y peso 800 para títulos; ancho normal para texto; 80% para controles.
- Reglas negras de 2px separan todo: hileras, pistas, sesiones, cabecera y colofón.
- Una sola cosa con sombra y movimiento: la credencial en su cinta.
- Sellos de goma girados (−4°) marcan el estado: «Por confirmar», «Cancelada».

## Colors

Papel y tinta acromáticos, con cuatro colores de pista saturados que se usan a escala de página.

### Primary
- **Azul de pista** (azul): la primera pista, «Antes de la charla». Rellena la pista, la banda de título de Privacidad, el código de las sesiones html-slides y, en celular, el campo del que cuelga la credencial. Es también el hover del botón de tinta, el color de acento de los controles nativos (`accent-color`, `caret-color`) y las viñetas de las listas de lectura. Texto en blanco (6,87:1).

### Secondary
- **Naranja de pista** (naranja): «Al empezar». Rellena la banda de los avisos (404, Enlace para presentar), los avisos de error y el hover de «Borrar». Texto en tinta (6,48:1; el blanco daría 2,87:1).
- **Verde de pista** (verde): «Durante». Rellena su pista y confirma «Copiado» en el botón de copiar. Texto en tinta (5,89:1; el blanco daría 3,15:1).

### Tertiary
- **Amarillo de pista** (amarillo): «Después» y el color de la cinta. Rellena la pista, la cinta, el aviso de éxito, la zona de subida al arrastrar un archivo, la selección de texto y el enlace de salto. Sobre la tinta es el texto del rol «Presentador» en la credencial, del usuario en la cabecera y el anillo de foco dentro de la cabecera (12,87:1). Texto sobre amarillo siempre en tinta.

### Neutral
- **Cartulina** (paper): fondo de todas las páginas, de la credencial y de los botones en reposo.
- **Tinta** (ink): texto, reglas de 2px, cabecera corrida, botón primario, anillo de foco por defecto, ranura de la credencial.
- **Tinta suave** (ink-soft): metadatos, notas de sala, colofón, cuota y botón deshabilitado (6,2:1 sobre cartulina).

### Named Rules
**The Track Ink Rule.** Sobre azul se escribe en cartulina; sobre naranja, verde y amarillo, en tinta. Todas las parejas pasan AA medidas; no se invierten.

**The Page-Scale Color Rule.** Un color de pista ocupa una región entera (pista, banda, código de sesión, aviso, campo de la credencial) o un estado completo de un control. No se usa como texto sobre cartulina, salvo las viñetas azules de las listas.

## Typography

**Display Font:** Archivo variable, condensada (`wdth` 62) (con Arial Narrow)
**Body Font:** Archivo variable, ancho normal (con system-ui)
**Label/Mono Font:** la misma Archivo; controles al 80% de ancho (`--semi`)

**Character:** una sola familia que cambia de ancho según el oficio: condensada y pesada para lo que se lee de lejos en un programa, normal para lo que se lee de cerca. Archivo va autoalojada (`/fonts/archivo-latin-wdth.woff2`, OFL, `wdth` 62–125, `wght` 100–900) y precargada.

### Hierarchy
- **Display** (800, clamp(6.5rem, 19vw, 17rem), 0.8): solo la palabra «Sliding» en la tapa, con sangría óptica negativa (−0.04em).
- **Headline** (800, clamp(3.5rem, 9vw, 6rem), 0.85): el h1 de los avisos y de Privacidad; el del panel usa clamp(3.5rem, 8vw, 6rem).
- **Title** (800, clamp(2.25rem, 3.6vw, 3.25rem), 0.95): títulos de pista; títulos de sesión a clamp(1.75rem, 2.6vw, 2.25rem); nombre en la credencial a clamp(3rem, 5vw, 4rem) en la tapa y 2.25rem en el panel.
- **Title small** (800, 1.5rem): la marca de la cabecera, los rótulos de las hileras de información y el rol «Presentador».
- **Body** (400, 1.0625rem, 1.55): texto corrido; 1rem bajo 560px. Medidas de 30ch en pistas, 52–62ch en avisos e hileras, 68ch en lectura.
- **Control** (700, `wdth` 80, 1.1): botones; la navegación de la cabecera usa 600.
- **Label** (800, condensada, mayúsculas, +0.04em): sellos de goma; el rol de la credencial va a +0.08em.
- **Numeral** (800, condensada, cifras tabulares y de caja): el número de diapositivas en el código de sesión; toda cifra de cuota, tamaño o fecha usa `tabular-nums lining-nums`.

### Named Rules
**The Condensed Word-Space Rule.** Todo texto condensado lleva `word-spacing: var(--condensed-words)` (0.1em). A 62% de ancho el espacio entre palabras casi desaparece; esta corrección lo devuelve. Aplica a h1–h3, marca, sellos, rol, rótulos de hilera, código de sesión y rótulos de sala.

**The Tabular Figures Rule.** Las cifras que se comparan (diapositivas, MB, presentaciones, fechas) van tabulares y de caja.

## Layout

Página a sangre con un margen fluido (`--gutter`, clamp(1rem, 3vw, 2.5rem)) y una cabecera corrida negra de 3rem. El colofón cierra cada página tras una regla de 2px.

- **Tapa:** ocupa la ventana menos la cabecera. Arriba a la izquierda, la palabra «Sliding» y una frase; el lado derecho queda libre (22rem más el margen) para la credencial. Abajo, cuatro pistas a todo el ancho en una rejilla de 4 columnas iguales, separadas por reglas de 2px. La credencial cuelga sobre la última pista, que se empuja hacia abajo para dejarle su franja (`--overlap`, 4.5rem).
- **Información general:** rótulo a la izquierda (1fr) y hileras a la derecha (2.2fr); todas las hileras miden lo que la más alta (`grid-auto-rows: 1fr`), rótulo de 10rem y texto.
- **Panel:** cabecera de dos columnas (título y subida a la izquierda, credencial a la derecha) y después el programa: una sesión por hilera de al menos 9rem, en cuatro columnas (código 7rem, título, botones de presentar, ver y compartir, acciones) separadas por reglas.
- **Lectura:** banda de título azul a todo el ancho y columna centrada de 68ch.
- **Avisos:** una banda de pista que llena el `main` entre cabecera y colofón.

**Responsive:** a 1100px la sesión pasa a tres columnas y los botones de presentar, ver y compartir bajan a una segunda fila. A 900px la tapa deja de ocupar la ventana, las pistas pasan a 2×2, la credencial de la tapa cuelga en flujo desde la regla superior de las pistas sobre un campo azul, la información pasa a una columna y la credencial del panel sube antes del título. A 560px las pistas van en una columna, las hileras apilan rótulo y texto, la sesión queda en código + título con los botones y las acciones debajo (acciones en fila), el sello del aviso pasa al flujo y la cabecera oculta el nombre del usuario.

## Elevation & Depth

Plano por completo: la profundidad la dan las reglas negras y los campos de color, no las sombras. La única excepción es la credencial, que es un objeto físico colgado delante del papel y por eso sí proyecta sombra.

### Shadow Vocabulary
- **Credencial colgada** (`box-shadow: 0 1.5rem 2.5rem -1.25rem rgb(17 19 24 / 0.45), 0 0.25rem 0.5rem rgb(17 19 24 / 0.12)`): solo en la credencial.

### Named Rules
**The One Object Rule.** Solo la credencial tiene sombra y movimiento propio. Todo lo demás está impreso en la cartulina.

**The Ruled Program Rule.** Las divisiones son reglas negras de 2px (`--rule`), no tarjetas ni fondos grises. Donde dos reglas coincidirían (un aviso sobre la lista), queda una sola.

## Shapes

Rectángulos de papel con esquinas vivas: pistas, bandas, hileras y sesiones no tienen radio. El radio aparece solo en lo que en el mundo real es un objeto aparte: los botones (10px), la credencial plastificada (16px), los sellos de goma (6px, con borde de 3px en el color del texto y girados −4°), la ranura de la credencial y las fotos de perfil (circulares, con regla de 2px). Los bordes son de tinta: 2px en controles, reglas y cinta; 3px en la credencial y los sellos. Un control deshabilitado cambia su borde a discontinuo.

## Components

### Buttons
Tinta sobre cartulina, gruesos y sobrios, como la tipografía de un programa.
- **Shape:** esquinas suavizadas (10px), borde de tinta de 2px, alto mínimo de 3rem (2.5rem en la variante pequeña).
- **Default:** cartulina con texto en tinta, Archivo 700 al 80% de ancho.
- **Primary (tinta):** tinta con texto en cartulina; es «Entrar con GitHub», «Ir a tu panel», «Subir una presentación .html», «Abrir la presentación».
- **Hover / Focus:** el default se invierte a tinta; el de tinta pasa a azul (fondo y borde). «Borrar» pasa a naranja con texto en tinta. Al pulsar baja 1px. Transiciones de 160ms con `--ease`. Foco: anillo de tinta de 3px a 3px de distancia; cartulina sobre azul, amarillo dentro de la cabecera.
- **Copiar:** al copiar se vuelve verde con «Copiado» durante 2s.
- **Disabled:** borde discontinuo, cartulina, texto en tinta suave.
- **Iconos:** solo las marcas SVG de GitHub y Google (1.25rem) en los botones de entrar; la de Google conserva sus colores de marca.

### Running head (Navigation)
- Barra de tinta de 3rem a todo el ancho con la marca «Sliding» condensada a la izquierda y la navegación (600, 80% de ancho) a la derecha. Los enlaces van sin subrayado y lo ganan al hover. El usuario conectado aparece en amarillo con su avatar circular de 24px; bajo 560px queda solo el avatar.

### Tracks
- Cuatro regiones de color a página entera, cada una titulada por su momento del día de la charla, con texto de 30ch. Separadas por reglas de 2px. La clase de pista se reutiliza para cualquier campo de color: banda de aviso, banda de lectura y código de sesión.

### Hanging Badge (signature)
La credencial plastificada colgada de una cinta amarilla de 3rem con bordes de tinta.
- **Anatomía:** ranura de tinta perforada arriba, foto circular opcional, nombre en condensada grande, contenido y, al pie y a sangre, la franja de tinta con «PRESENTADOR» en amarillo. Cartulina, borde de 3px, radio de 16px, sombra de la credencial.
- **Variante tapa:** la cinta sube por detrás de la cabecera corrida y la credencial queda centrada sobre la última pista, pero nunca más allá del margen (ancho clamp(13.5rem, 25vw − 2rem, 20rem)). Lleva el saludo y los botones para entrar, o «Ir a tu panel» si ya hay sesión. Bajo 900px cuelga en flujo, centrada, desde la regla superior de las pistas sobre el campo azul, con una cinta de 2.5rem.
- **Variante panel:** cuelga de la cabecera corrida con una cinta de 2.5rem, 17rem de ancho, con el nombre del Dueño y su cuota en cifras tabulares.
- **Movimiento:** se balancea una vez al cargar (1.8s, `--ease`, desde 6° amortiguándose a 0°) desde su ranura y se asienta.

### Session row (Cards / Containers)
- Una hilera del programa entre reglas, sin radio ni sombra. El código va en un campo de pista: azul con el número de diapositivas para presentaciones html-slides, amarillo con «HTML genérica» para el resto. Le siguen el título y los metadatos; los botones «Presentar con control» (tinta), «Ver diapositivas» y «Copiar enlace para compartir» (sin mostrar direcciones: son botones, no enlaces a la vista); y las acciones «Reemplazar» y «Borrar».

### Stamp
- Sello de goma: mayúsculas condensadas 800, borde de 3px en el color del texto, radio de 6px, girado −4°. Marca lo que todavía no existe («Por confirmar») o lo que ya no está («Cancelada»).

### Notices
- Una sesión del programa a escala de página: la banda naranja llena el espacio entre cabecera y colofón, con titular, texto de 52ch, un botón de tinta y el sello en la esquina inferior derecha (en flujo bajo 560px). El 404 dice «Cancelada».

### Reading page
- Banda de título azul con texto en cartulina sobre una regla; debajo, texto de lectura en tinta sobre cartulina a 68ch, con secciones abiertas por una regla de 2px y viñetas azules.

### Inputs / Fields
- **Subida:** caja con regla de 2px y radio de 10px que contiene el botón de tinta con el input de archivo oculto y una nota de tinta suave (34ch). Al arrastrar un archivo sobre la página se rellena de amarillo; elegir o soltar el archivo ya lo sube. El nombre elegido pasa a tinta y 600.
- **Avisos (flash):** franja a todo el ancho con reglas arriba y abajo, amarilla para éxito y naranja para error, texto en tinta 600.

### Pantalla (Sesión en vivo)
- La presentación a toda la ventana y, encima, la preparación en tinta (la sala suele estar a oscuras): titular, pasos numerados en amarillo, botón «Pantalla completa» y, a la derecha, la tarjeta del QR de control en cartulina con su banda naranja «Este QR es el control de tus diapositivas. No lo compartas.». Al emparejar, la preparación se desvanece (600ms). Los avisos breves salen abajo a la izquierda en amarillo. Abierta en un celular, en vez del QR explica que la Pantalla va en el computador del proyector y ofrece enviar el enlace o ver la presentación ahí mismo.

### Control (Sesión en vivo)
- Oscuro, porque se usa de pie y con poca luz: fondo de tinta y texto en cartulina. Arriba, el título y el contador en amarillo; debajo, el reloj y el cronómetro (verde lleno cuando corre, solo borde cuando está pausado o sin empezar; se pausa al tocarlo).
- Con una Presentación html-slides: las miniaturas «Ahora» y «Sigue» (la misma presentación dibujada a 1280 y escalada, con regla de cartulina y radio de 6px), las notas del presentador a 1.25rem con saltos de línea, «Siguiente» azul de al menos 7rem al alcance del pulgar, «Anterior» y «Diapositivas» con borde de cartulina, y «Terminar sesión» con borde naranja.
- «Diapositivas» abre una hoja a pantalla completa con la lista numerada (número condensado y título de cada diapositiva); la actual va en amarillo.
- Con una Presentación genérica: sin notas, miniaturas, lista ni contador; «Siguiente» ocupa casi toda la pantalla.

### Visor de la presentación
- La página del Enlace de la presentación no carga la hoja de estilos ni la fuente de Sliding: un iframe a toda la ventana sobre negro, sin marca encima.

## Do's and Don'ts

### Do:
- **Do** emparejar cartulina sobre azul y tinta sobre naranja, verde y amarillo.
- **Do** usar los colores de pista como regiones enteras o estados completos, y reutilizar la clase de pista para cualquier campo de color nuevo.
- **Do** separar con reglas de tinta de 2px (`--rule`) y fusionar las reglas que coincidan.
- **Do** poner `word-spacing: var(--condensed-words)` en todo texto con `font-stretch: var(--condensed)`.
- **Do** escribir las cifras comparables con `tabular-nums lining-nums`.
- **Do** marcar estados con el sello girado: «Por confirmar» para lo que falta, «Cancelada» para lo que ya no existe.
- **Do** desactivar animaciones y transiciones con `prefers-reduced-motion: reduce`.

### Don't:
- **Don't** escribir en blanco sobre naranja, verde o amarillo, ni en tinta sobre azul.
- **Don't** dar sombra, radio o movimiento a nada que no sea un objeto aparte; la sombra es solo de la credencial.
- **Don't** usar degradados, maquetas de dispositivos ni titulares de landing SaaS.
- **Don't** usar tarjetas con fondo gris para agrupar: la agrupación es la hilera entre reglas.
- **Don't** poner estilos, marca ni cabecera de Sliding en la página del Enlace de la presentación.
- **Do** mantener oscuros la preparación de la Pantalla y el Control: su escena es una sala con la luz baja. La cartulina queda para lo que es papel o plástico (la tarjeta del QR, el botón «Cerrar»).
