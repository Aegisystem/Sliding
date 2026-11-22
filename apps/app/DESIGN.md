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
  code:
    fontFamily: "ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
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

Sliding se ve como el programa impreso de un congreso con su credencial colgada de la cinta. Cartulina blanca, tinta negra y cuatro pistas de color que ocupan regiones enteras de la página, nunca detalles sueltos. Cada presentación es una sesión del programa: tiene su código (cuántas diapositivas, «PDF» o «HTML genérica»), su título y lo que se hace con ella: presentarla con control, verla o compartirla. La información vive en hileras entre reglas negras de 2px, como las tablas del final de un programa.

La densidad es de impreso, no de aplicación: títulos condensados muy grandes, texto corrido de ancho normal, cifras tabulares, y casi ningún adorno que no exista en papel. El único objeto con volumen es la credencial plastificada, que cuelga de una cinta amarilla, se balancea una vez al cargar y se asienta. Es el control para entrar y, ya dentro, la identidad del Dueño en el panel.

El mundo rechaza la landing SaaS de titular, degradado y maqueta de laptop con celular. Y se detiene en la puerta de la presentación: la página del Enlace de la presentación (`/d/<id>`) no lleva nada de Sliding, porque la presentación es del Dueño.

**Key Characteristics:**
- Cartulina blanca y tinta negra; el color llega como campos de página, no como texto.
- Cuatro pistas (azul, naranja, verde, amarillo), cada una con su tinta de texto medida.
- Archivo variable: condensada al 62% y peso 800 para títulos; ancho normal para texto; 80% para controles.
- Reglas negras de 2px separan todo: hileras, pistas, sesiones, cabecera y colofón.
- Una sola cosa con sombra y movimiento: la credencial en su cinta. La única otra es la ficha de una hilera mientras se arrastra, porque en ese momento es un objeto en el aire.
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
- **Title** (800, clamp(2.25rem, 3.6vw, 3.25rem), 0.95): títulos de pista y los rótulos «Carpetas» y «Presentaciones» sobre cada lista; títulos de sesión a clamp(1.75rem, 2.6vw, 2.25rem); nombre en la credencial a clamp(3rem, 5vw, 4rem) en la tapa y 2.25rem en el panel.
- **Title small** (800, 1.5rem): la marca de la cabecera, los rótulos de las hileras de información y el rol «Presentador».
- **Body** (400, 1.0625rem, 1.55): texto corrido; 1rem bajo 560px. Medidas de 30ch en pistas, 52–62ch en avisos e hileras, 68ch en lectura.
- **Control** (700, `wdth` 80, 1.1): botones; la navegación de la cabecera usa 600.
- **Label** (800, condensada, mayúsculas, +0.04em): sellos de goma; el rol de la credencial va a +0.08em.
- **Code** (400, monoespaciada del sistema, 0.9375rem, 1.5): solo el texto completo de la skill en /skill, que es código para copiar a una IA.
- **Numeral** (800, condensada, cifras tabulares y de caja): el número de diapositivas en el código de sesión; toda cifra de cuota, tamaño o fecha usa `tabular-nums lining-nums`.

### Named Rules
**The Condensed Word-Space Rule.** Todo texto condensado lleva `word-spacing: var(--condensed-words)` (0.1em). A 62% de ancho el espacio entre palabras casi desaparece; esta corrección lo devuelve. Aplica a h1–h3, marca, sellos, rol, rótulos de hilera, código de sesión y rótulos de sala.

**The Tabular Figures Rule.** Las cifras que se comparan (diapositivas, MB, presentaciones, fechas) van tabulares y de caja.

## Layout

Página a sangre con un margen fluido (`--gutter`, clamp(1rem, 3vw, 2.5rem)) y una cabecera corrida negra de 3rem. El colofón cierra cada página tras una regla de 2px.

- **Tapa:** ocupa la ventana menos la cabecera. Arriba a la izquierda, la palabra «Sliding» y una frase; el lado derecho queda libre (22rem más el margen) para la credencial. Abajo, cuatro pistas a todo el ancho en una rejilla de 4 columnas iguales, separadas por reglas de 2px. La credencial cuelga sobre la última pista, que se empuja hacia abajo para dejarle su franja (`--overlap`, 4.5rem).
- **Información general:** rótulo a la izquierda (1fr) y hileras a la derecha (2.2fr); todas las hileras miden lo que la más alta (`grid-auto-rows: 1fr`), rótulo de 10rem y texto.
- **Panel:** si el Dueño tiene carpetas, a la izquierda va el árbol de carpetas en una columna de clamp(13rem, 17vw, 16.5rem) que corre de la cabecera al colofón, con su regla de 2px a la derecha; el árbol se queda a la vista al desplazar la página. A la derecha, cabecera de dos columnas (título y subida a la izquierda, credencial a la derecha) y después el programa: una sesión por hilera de al menos 9rem, en cuatro columnas (código 7rem, título, botones de presentar, ver y compartir, y «Más») separadas por reglas.
- **Lectura:** banda de título azul a todo el ancho y columna centrada de 68ch.
- **Avisos:** una banda de pista que llena el `main` entre cabecera y colofón.

**Responsive:** a 1100px la sesión pasa a tres columnas y los botones de presentar, ver y compartir bajan a una segunda fila. A 900px la tapa deja de ocupar la ventana, las pistas pasan a 2×2, la credencial de la tapa cuelga en flujo desde la regla superior de las pistas sobre un campo azul, la información pasa a una columna, la credencial del panel sube antes del título y el árbol de carpetas pasa a un botón «Carpetas» encima de las listas. A 560px las pistas van en una columna, las hileras apilan rótulo y texto, la sesión queda en código + título con los botones y «Más» debajo, a todo el ancho, el sello del aviso pasa al flujo y la cabecera oculta el nombre del usuario.

## Elevation & Depth

Plano por completo: la profundidad la dan las reglas negras y los campos de color, no las sombras. La única excepción es la credencial, que es un objeto físico colgado delante del papel y por eso sí proyecta sombra.

### Shadow Vocabulary
- **Credencial colgada** (`box-shadow: 0 1.5rem 2.5rem -1.25rem rgb(17 19 24 / 0.45), 0 0.25rem 0.5rem rgb(17 19 24 / 0.12)`): en la credencial y, mientras está en el aire, en la ficha de la hilera que se arrastra.

### Named Rules
**The One Object Rule.** Solo la credencial tiene sombra y movimiento propio. Todo lo demás está impreso en la cartulina. La excepción dura lo que dura un arrastre: la hilera que se levanta del programa es un objeto en la mano, y al soltarla vuelve a quedar impresa.

**The Ruled Program Rule.** Las divisiones son reglas negras de 2px (`--rule`), no tarjetas ni fondos grises. Donde dos reglas coincidirían (un aviso sobre la lista), queda una sola.

## Shapes

Rectángulos de papel con esquinas vivas: pistas, bandas, hileras y sesiones no tienen radio. El radio aparece solo en lo que en el mundo real es un objeto aparte: los botones (10px), la credencial plastificada (16px), los sellos de goma (6px, con borde de 3px en el color del texto y girados −4°), la ranura de la credencial y las fotos de perfil (circulares, con regla de 2px). Los bordes son de tinta: 2px en controles, reglas y cinta; 3px en la credencial y los sellos. Un control deshabilitado cambia su borde a discontinuo.

## Components

### Buttons
Tinta sobre cartulina, gruesos y sobrios, como la tipografía de un programa.
- **Shape:** esquinas suavizadas (10px), borde de tinta de 2px, alto mínimo de 3rem (2.5rem en la variante pequeña).
- **Default:** cartulina con texto en tinta, Archivo 700 al 80% de ancho.
- **Primary (tinta):** tinta con texto en cartulina; es «Entrar con GitHub», «Ir a tu panel», «Subir una presentación», «Abrir la presentación».
- **Hover / Focus:** el default se invierte a tinta; el de tinta pasa a azul (fondo y borde). «Borrar» pasa a naranja con texto en tinta. Al pulsar baja 1px. Transiciones de 160ms con `--ease`. Foco: anillo de tinta de 3px a 3px de distancia; cartulina sobre azul, amarillo dentro de la cabecera.
- **Copiar:** al copiar se vuelve verde con «Copiado» durante 2s.
- **Disabled:** borde discontinuo, cartulina, texto en tinta suave.
- **Iconos:** solo las marcas SVG de GitHub y Google (1.25rem) en los botones de entrar; la de Google conserva sus colores de marca.

### Running head (Navigation)
- Barra de tinta de 3rem a todo el ancho con la marca «Sliding» condensada a la izquierda y la navegación (600, 80% de ancho) a la derecha. Los enlaces van sin subrayado y lo ganan al hover. El usuario conectado aparece en amarillo con su avatar circular de 24px; bajo 560px queda solo el avatar.
- **Idioma:** al final, el botón que lleva al otro idioma, escrito en ese idioma («English» o «Español») y con borde de cartulina de 2px y radio de 6px, como un sello pequeño; al hover se rellena de cartulina con texto en tinta. Bajo 560px dice solo «EN» o «ES». Vuelve a la misma página y recuerda el idioma. Sin elegir, la interfaz sigue al navegador, e inglés si no es español ni inglés.

### Tracks
- Cuatro regiones de color a página entera, cada una titulada por su momento del día de la charla, con texto de 30ch. Separadas por reglas de 2px. La clase de pista se reutiliza para cualquier campo de color: banda de aviso, banda de lectura y código de sesión.

### Hanging Badge (signature)
La credencial plastificada colgada de una cinta amarilla de 3rem con bordes de tinta.
- **Anatomía:** ranura de tinta perforada arriba, foto circular opcional, nombre en condensada grande, contenido y, al pie y a sangre, la franja de tinta con «PRESENTADOR» en amarillo. Cartulina, borde de 3px, radio de 16px, sombra de la credencial.
- **Variante tapa:** la cinta sube por detrás de la cabecera corrida y la credencial queda centrada sobre la última pista, pero nunca más allá del margen (ancho clamp(13.5rem, 25vw − 2rem, 20rem)). Lleva el saludo y los botones para entrar, o «Ir a tu panel» si ya hay sesión. Bajo 900px cuelga en flujo, centrada, desde la regla superior de las pistas sobre el campo azul, con una cinta de 2.5rem.
- **Variante panel:** cuelga de la cabecera corrida con una cinta de 2.5rem, 17rem de ancho, con el nombre del Dueño, su cuota en cifras tabulares y el enlace subrayado «Claves para Agentes» (700 al 80% de ancho, 0.9375rem).
- **Movimiento:** se balancea una vez al cargar (1.8s, `--ease`, desde 6° amortiguándose a 0°) desde su ranura y se asienta.

### Session row (Cards / Containers)
- Una hilera del programa entre reglas, sin radio ni sombra. El código va en un campo de pista: azul con el número de diapositivas para presentaciones html-slides, naranja para las Presentaciones en PDF (el número de diapositivas o, si el servidor no lo pudo contar, «PDF») y amarillo con «HTML genérica» para el resto. Le siguen el título y los metadatos; los botones «Presentar con control» (tinta), «Ver diapositivas» y «Copiar enlace para compartir» (sin mostrar direcciones: son botones, no enlaces a la vista); y el menú «Más» con «Reemplazar», «Mover a» y «Borrar».
- **Desactivada por la moderación:** en vez de «Presentar con control», «Ver diapositivas» y «Copiar enlace», la columna lleva el aviso en una caja naranja con texto en tinta («Desactivada. Nadie puede verla ni presentarla.»), y en «Más» quedan «Mover a» y «Borrar».
- **Presentación en PDF:** los metadatos dicen «con notas» o «sin notas», y en «Más» va «Agregar notas» (o «Cambiar notas»), que pide el .pptx y no lo sube. Si el .pptx y el PDF no tienen las mismas diapositivas, bajo los metadatos sale un aviso en una franja naranja con texto en tinta 600, como los avisos de error.
- **Carpeta:** la misma hilera con el código en verde y el número de presentaciones que tiene; el título es un enlace a la carpeta y los metadatos dicen cuántas carpetas tiene dentro. Botones «Abrir carpeta» (tinta) y «Copiar enlace para compartir»; en «Más», «Mover a» y «Borrar». Las carpetas van en su propia lista, antes de las presentaciones; cuando hay de las dos, cada lista lleva su rótulo en la talla Title.
- **Subir y Bajar:** dos chevrones en el color del texto del código, arriba y abajo del número, cada uno en un blanco de 2.75 × 2rem; el de la primera hilera y el de la última quedan al 30% y no hacen nada, pero conservan el foco. Aparecen solo con JS y con dos hileras o más. Con el foco en uno, las flechas del teclado también mueven. El orden se guarda solo.
- **Arrastrar:** la hilera entera se arrastra desde cualquier parte que no sea un control, y lo anuncian seis puntos en tinta suave a la derecha del título (con el mouse pasan a tinta sobre un fondo de tinta al 8%). Con el mouse empieza al moverla 5px (cursor de mano). Con el dedo, al mantenerlo 320ms sin moverlo, o al instante desde los seis puntos (blanco de 2.75rem); deslizar sin esperar sigue desplazando la página, y mantener el título de una carpeta no la abre. Con el mouse, una carpeta también se toma del nombre: un clic sin mover la abre. Se arrastra si hay adónde: otro lugar en la lista, una carpeta de la lista, de la ruta o del árbol.
  - **Levantar:** el código y el título se despegan como una **ficha**: una tira amarilla con regla de 2px, el código en su color de pista y el título en condensada 800 en una línea, que crece al 103% y toma la sombra de la credencial en 200ms. Sigue al puntero (con el dedo, queda arriba de él) y se mece con la velocidad horizontal hasta ±6°, como la credencial en su cinta. Nunca se sale por la izquierda.
  - **Plegar:** a la vez, cada hilera se pliega a su código y su título (las alturas se animan en 260ms con `--ease`), y la hilera levantada queda como un **hueco**: su lugar entre reglas con un borde discontinuo en tinta suave. El hueco se queda bajo el puntero mientras todo se pliega; si la página ya no puede subir, se abre un espacio arriba de las listas que se cierra al soltar.
  - **Ordenar:** al pasar la mitad de una vecina, el hueco cambia de lugar y las hileras se deslizan en 180ms con `--ease`. Cerca del borde de la ventana, la página se desplaza sola.
  - **Meter en una carpeta:** sobre otra carpeta (si es de la misma lista, en su mitad del medio), sobre la ruta de carpetas o sobre una carpeta del árbol, el destino se pinta de verde entero, la ficha se encoge al 60% y se transparenta un poco, el hueco se apaga, y junto al puntero aparece una etiqueta de tinta con texto en cartulina: «Mover a «Unidad 1»». Mientras se arrastra, la ruta y las carpetas del árbol que pueden recibir se subrayan en guiones; la carpeta donde ya está, y si se arrastra una carpeta, ella misma y las de dentro, no. Sobre el árbol o la ruta el hueco se queda quieto. Si la ficha se detiene 650ms sobre una carpeta cerrada del árbol, la carpeta se abre.
  - **Soltar:** entre hileras, la ficha baja a su hueco en 200ms, pierde la sombra y se funde con la hilera; las hileras se despliegan en 340ms. Sobre una carpeta, la ficha entra en su código (en el árbol, por el comienzo del nombre) y desaparece (340ms), el hueco se cierra, la carpeta se apaga y su número sube con un pequeño salto. Una carpeta movida pasa en el árbol a su carpeta nueva, que se abre, y su nombre se marca en amarillo y se apaga en 1.2s. Esc cancela y todo vuelve a su lugar.
  - **Deshacer:** después de mover algo a otra carpeta, un pie corrido de tinta sube desde abajo (300ms) con el texto en cartulina 600 («La célula» quedó en «Unidad 2».) y el botón pequeño «Deshacer» en cartulina, que pasa a amarillo al hover y con el foco. Se va solo a los 8s, salvo con el mouse o el foco encima.
  - **Reducir movimiento:** sin balanceo, sin crecer ni encoger, y todos los cambios son inmediatos; los colores de estado se mantienen.
- **Oculta (#23):** dentro de una carpeta, una hilera oculta lleva bajo los metadatos un sello pequeño «Oculta» (borde de 2px, 0.9375rem, girado −4°), la nota en tinta suave «No sale en el enlace de la carpeta.» y el botón pequeño de tinta «Mostrar»; su título pasa a tinta suave. Una visible se oculta con «Ocultar de la carpeta» en «Más». El cambio no recarga: al ocultar, el sello cae sobre la hilera (320ms, desde 1.6× y −10°) y el foco pasa a «Mostrar»; al mostrar, a «Más». En la raíz del panel no aparece nada de esto, porque ahí nada está en un Enlace de la carpeta.
- **En el Enlace de la carpeta:** la hilera pierde las acciones del Dueño y queda con un solo botón: «Abrir carpeta» o «Ver presentación» (tinta).

### Árbol de carpetas
- La columna izquierda del panel: el título «Carpetas» en la talla Title small y, debajo, «Tus presentaciones» con todas las carpetas del Dueño en el orden que les dio. Cada nivel entra 0.8rem con una guía de 2px en tinta al 14%. Los nombres van en 700 al 80% de ancho, en una línea que se parte si hace falta; al hover, un fondo de tinta al 8% con radio de 6px.
- **Carpeta abierta:** un campo de tinta con texto en cartulina, como la cabecera.
- **Carpeta oculta:** su nombre en tinta suave y 600; un lector de pantalla oye «(oculta)».
- **Abrir y cerrar:** una flecha de tinta (blanco de 1.75rem) antes de cada carpeta con carpetas dentro gira 90° en 160ms. Al cargar se ve abierta la ruta hasta la carpeta abierta; las demás, cerradas. Sin JS la flecha no se ve pero guarda su lugar.
- **En el celular:** el botón pequeño «Carpetas» con su flecha, encima de las listas, abre el árbol en una caja con regla de 2px y radio de 10px. Sin JS el árbol se ve siempre.
- Sin carpetas no hay árbol, y el panel ocupa todo el ancho.

### Ruta de carpetas
- Encima del h1 de una carpeta, la ruta desde «Tus presentaciones»: enlaces en 700 al 80% de ancho, sin subrayado hasta el hover, cada uno seguido de una barra en tinta suave (en tinta sobre verde). La última barra apunta al título. En el Enlace de la carpeta la ruta empieza en la carpeta por la que se entró.

### Enlace de la carpeta
- Banda verde a todo el ancho con la ruta, el nombre de la carpeta en la talla Headline y cuántas presentaciones y carpetas tiene; la regla de abajo de la banda es la de arriba de la primera lista. Sin notas, sin Enlace para presentar y sin acciones del Dueño.

### Stamp
- Sello de goma: mayúsculas condensadas 800, borde de 3px en el color del texto, radio de 6px, girado −4°. Marca lo que todavía no existe («Por confirmar»), lo que ya no está («Cancelada») o lo que el Dueño todavía no muestra en su carpeta («Oculta», en su variante pequeña).

### Notices
- Una sesión del programa a escala de página: la banda naranja llena el espacio entre cabecera y colofón, con titular, texto de 52ch, un botón de tinta y el sello en la esquina inferior derecha (en flujo bajo 560px). El 404 dice «Cancelada».

### Reading page
- Banda de título azul con texto en cartulina sobre una regla; debajo, texto de lectura en tinta sobre cartulina a 68ch, con secciones abiertas por una regla de 2px y viñetas azules.

### Inputs / Fields
- **Subida:** caja con regla de 2px y radio de 10px que contiene el botón de tinta con el input de archivo oculto, una nota de tinta suave (34ch) y, debajo a todo el ancho, cómo traer una presentación de PowerPoint (60ch). Al arrastrar un archivo sobre la página se rellena de amarillo; elegir o soltar el archivo (o el PDF con su .pptx) ya lo sube. El nombre elegido pasa a tinta y 600; mientras se leen las notas del .pptx, la nota lo dice.
- **Nueva carpeta:** botón junto a «Subir una presentación», dentro de la caja de subir; al abrir el campo queda en tinta. Debajo de la caja se abre (220ms, desliza 0.5rem) otra caja con regla de 2px y radio de 10px, de hasta 38rem: el rótulo «Carpeta nueva» (o «Carpeta nueva dentro de «Unidad 1»»), en 700 al 80% de ancho, y en una línea el campo del nombre, «Crear carpeta» (tinta) y «Cancelar». Esc también cierra. Sin JS, o si el nombre volvió con error, la caja se ve abierta.
- **Campo de texto:** cartulina con borde de tinta de 2px y radio de 10px, como los botones; texto en 600 y marcador en tinta suave 400.
- **Más:** botón pequeño «Más» con una flecha hacia abajo, que al abrir queda en tinta y la flecha sube. Abre una hoja de cartulina con regla de 2px y radio de 10px, sin sombra, de 15rem, alineada a la derecha bajo el botón y encima de las hileras de abajo (180ms, desliza 0.5rem): «Reemplazar», «Agregar notas» si es un PDF, «Mover a» y, tras una regla, «Borrar». Un menú abierto a la vez; se cierra al hacer clic fuera o con Esc. En el celular el botón va a todo el ancho y la hoja se abre en el lugar, empujando lo de abajo.
- **Mover a:** dentro de «Más», el rótulo «Mover a» en tinta suave 600 y un select del alto de un botón pequeño (2.5rem), cartulina con chevrón de tinta, amarillo al hover, que dice «Elige una carpeta…». Lista cada carpeta con su ruta («Biología 2027 / Unidad 1») y marca «(aquí)» la actual; elegir una ya mueve. Es el camino para mover sin arrastrar: con el teclado o un lector de pantalla.
- **Carpeta abierta:** debajo del h1, botones pequeños «Copiar enlace de la carpeta», «Ver como la ven los demás», «Cambiar nombre» (abre el campo con «Guardar nombre») y «Borrar carpeta».
- **Avisos (flash):** franja a todo el ancho con reglas arriba y abajo, amarilla para éxito y naranja para error, texto en tinta 600. Los errores al elegir archivos (un .pptx sin su PDF, un .pptx que no se puede leer) salen en la misma franja naranja, sin recargar.

### Pantalla (Sesión en vivo)
- La presentación a toda la ventana y, encima, la preparación en tinta (la sala suele estar a oscuras): titular, pasos numerados en amarillo, botón «Pantalla completa» y, a la derecha, la tarjeta del QR de control en cartulina con su banda naranja «Este QR es el control de tus diapositivas. No lo compartas.». Al emparejar, la preparación se desvanece (600ms). Los avisos breves salen abajo a la izquierda en amarillo. Abierta en un celular, en vez del QR explica que la Pantalla va en el computador del proyector y ofrece enviar el enlace o ver la presentación ahí mismo.

### Control (Sesión en vivo)
- Oscuro, porque se usa de pie y con poca luz: fondo de tinta y texto en cartulina. Arriba, el título y el contador en amarillo; debajo, el reloj y el cronómetro (verde lleno cuando corre, solo borde cuando está pausado o sin empezar; se pausa al tocarlo).
- Con una Presentación html-slides: la miniatura de la diapositiva que sigue con su título al lado («Sigue: …»; la misma presentación dibujada a 1280 y escalada, con regla de cartulina y radio de 6px), las notas del presentador a 1.25rem con saltos de línea, «Siguiente» azul de al menos 7rem al alcance del pulgar, «Anterior» y «Diapositivas» con borde de cartulina, y «Terminar sesión» con borde naranja.
- «Diapositivas» abre una hoja a pantalla completa con la lista numerada (número condensado y título de cada diapositiva); la actual va en amarillo.
- Con una Presentación en PDF: igual que html-slides. Sin las notas de su .pptx, la miniatura de la que sigue va a todo el ancho y «Siguiente» toma el espacio de las notas.
- Con una Presentación genérica: sin notas, miniaturas, lista ni contador; «Siguiente» ocupa casi toda la pantalla.

### Moderación
- Página del Administrador con el mismo marco que el panel, sin credencial: h1 en la talla del panel, una línea de tinta suave y la caja «Pega el enlace de una presentación o carpeta» (campo de texto más «Buscar» de tinta, hasta 46rem). Lo encontrado, las subidas recientes y los Dueños van en hileras del programa bajo rótulos en la talla Title; dos listas seguidas comparten la regla.
- Hilera de presentación: su código de pista, título (enlace a la presentación si se ve), «tipo · de Dueño · subida el · peso», y una acción: «Desactivar» (pide confirmación, hover naranja) o «Reactivar». Lo desactivado lleva su aviso en franja naranja bajo los metadatos.
- Hilera de Dueño: el código en cartulina con cuántas presentaciones tiene; nombre, proveedor, correo, peso y última entrada; «Desactivar cuenta» o «Reactivar cuenta». La propia dice «Tu cuenta.» y no se puede desactivar.
- Mientras no hay Administrador, la página es de lectura con banda amarilla y muestra el id de la cuenta en un recuadro con regla de 2px, fácil de seleccionar.

### Claves para Agentes
- Página del Dueño con el marco de la moderación: la ruta «Tus presentaciones», el h1 en la talla del panel, una línea de tinta suave, la línea en 600 que da el enlace a `/llms.txt` para el Agente y la caja de «Nueva carpeta» con «Nombre de la clave», el campo («Claude en mi Mac»), «Crear clave» (tinta) y una ayuda en tinta suave.
- **Clave recién creada:** en lugar de la caja, un campo amarillo entre reglas con «Tu clave «…»» en condensada, el aviso en 600 («Cópiala ahora…»), la clave en monoespaciada sobre una caja de cartulina con regla de 2px (se selecciona entera), «Copiar la clave» (tinta; al copiar, verde con «Clave copiada») y el botón pequeño «Ya la copié», que vuelve a la página sin la clave.
- **Hileras:** sin código de pista; el nombre, «Usada por última vez el …» o «Todavía no se usa» y la fecha de creación, y «Revocar» pequeño (pide confirmación, hover naranja). En el celular, «Revocar» baja bajo el nombre.

### Visor de la presentación
- La página del Enlace de la presentación no carga la hoja de estilos ni la fuente de Sliding: un iframe a toda la ventana sobre negro, sin marca encima.
- **Visor de PDF** (en el origen de las presentaciones): cada página centrada sobre negro, como en un proyector, dibujada con la nitidez de la pantalla (hasta 4K). Mientras carga, solo un texto gris del sistema al centro con el avance («Cargando la presentación… 45 %»). Se avanza con las flechas, un clic o deslizando.

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
- **Don't** dar sombra, radio o movimiento a nada que no sea un objeto aparte; la sombra es de la credencial y de la ficha mientras se arrastra.
- **Don't** usar degradados, maquetas de dispositivos ni titulares de landing SaaS.
- **Don't** usar tarjetas con fondo gris para agrupar: la agrupación es la hilera entre reglas.
- **Don't** poner estilos, marca ni cabecera de Sliding en la página del Enlace de la presentación.
- **Do** mantener oscuros la preparación de la Pantalla y el Control: su escena es una sala con la luz baja. La cartulina queda para lo que es papel o plástico (la tarjeta del QR, el botón «Cerrar»).
