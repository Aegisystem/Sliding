# Dirección visual

El motor es el mismo; la **forma** cambia en cada presentación. Elige una dirección según el tono de la charla y cámbiala de verdad: paleta, fuentes, grosor de trazo, nivel de temblor y ritmo de la animación.

## Principios (siempre)

- **Una idea por slide.** Máximo ~15 palabras visibles. Lo demás va al guion o a `<aside class="notes">`.
- **Se lee desde el fondo de la sala.** La escala tipográfica del motor ya está calibrada para eso; para agrandar o achicar, cambia todos los tamaños en proporción, no uno suelto.
- **Tres colores.** Fondo, texto, un acento. `--muted` es una variación del texto, no un cuarto color.
- **Contraste AA mínimo**: `--fg` ≥ 7:1, `--muted` y `--accent` ≥ 4.5:1 sobre `--bg`. Compruébalo con `scripts/contrast.py`.
- **El acento marca lo importante**: la palabra clave en `<em>`, el trazo protagonista en `class="a"`. Si todo es acento, nada lo es.

## Estilo de ilustración

Elige uno por presentación según el tono; el motor soporta todos. El trazo a mano es una opción entre varias, no la de siempre.

| Estilo | Cómo se ve | Cómo se hace | Animación |
|---|---|---|---|
| **A mano** | boceto, cercano, humano | trazos `d` + `--art-filter: url(#rough)` | se dibuja solo (`d`) |
| **Línea limpia** | preciso, editorial, moderno | trazos `d` + `--art-filter: none` | se dibuja solo (`d`) |
| **Plano** | formas rellenas, gráfico, alegre | `rect`/`circle`/`path` con `solid`, `tint`, `ground`, sin trazo | crecen desde el centro (`p`) |
| **Mixto** | formas planas de fondo + una línea encima | `tint`/`solid` con `p` + trazos `d` encima | primero aparecen las formas, luego se dibuja la línea |
| **Tipográfico** | sin dibujos; la palabra es la imagen | sin `.art`; palabras enormes, `<em>`, tachados, `.rise` por partes | el texto aparece en orden (`rise`) |
| **Diagrama** | datos, procesos, ciencia | líneas limpias, flechas, barras o ejes simples; etiquetas con `text` | trazos `d` en el orden en que se explica |

Mantén **un** estilo en toda la presentación; el único cambio permitido es usar el tipográfico en alguna slide suelta.

## Direcciones de ejemplo

Úsalas como punto de partida y mézclalas; no repitas la misma dirección en dos presentaciones seguidas.

| Dirección | Para charlas… | `--bg` / `--fg` / `--accent` | Fuentes (display / texto) | Ilustración y movimiento |
|---|---|---|---|---|
| **Calma** | bienestar, emociones | `#eaf1ef` / `#1d2a2b` / `#25685a` | Newsreader / Atkinson Hyperlegible | a mano, `--stroke 2.4`, lento (`--draw-time 1.3s`) |
| **Pizarra** | educación, ciencia | `#1f2a24` / `#eef0e6` / `#f2c14e` | Caveat / Lexend | a mano muy marcado (scale 3.5), trazos rápidos (`.9s`) |
| **Cuaderno** | historias personales | `#fbf7ee` + líneas con `repeating-linear-gradient` / `#2b2b2b` / `#c2410c` | Young Serif / Nunito | mixto, stagger amplio (`.35s`) |
| **Plano técnico** | ingeniería, producto | `#0e2a47` / `#e6eef7` / `#7dd3fc` | IBM Plex Serif / IBM Plex Mono | diagrama, línea limpia, `--stroke 1.6`, rápido |
| **Póster** | marketing, energía, jóvenes | `#fff4e0` / `#1a1a1a` / `#e4572e` | Bricolage Grotesque / Lexend | plano, `pop` rápido, `--display-weight 700` |
| **Editorial** | negocios, ideas, ensayo | `#f7f7f5` / `#111111` / `#1d4ed8` | Cormorant Garamond / Source Sans 3 | tipográfico o línea limpia, fades largos (`--fade 1s`) |
| **Nocturno** | tecnología, futuro | `#0b0d17` / `#e8e8f0` / `#a78bfa` | Unbounded / Atkinson Hyperlegible | línea limpia, `--stroke 2`, fades largos |

Verifica el contraste de cada combinación antes de usarla; las de la tabla son orientativas.

**Fuentes muy vistas** (Inter, Roboto, Fraunces, Geist, Plus Jakarta Sans, Space Grotesk, Instrument Sans) hacen que todo se vea igual; elige otra salvo que el usuario la pida. Para el texto chico prioriza legibilidad (Atkinson Hyperlegible, Lexend, Source Sans 3, Nunito).

## Variar la forma, no solo el color

- **Layouts**: alterna `big`, `split`, `grid`, `row`, cita. Tres slides seguidas con el mismo layout cansan.
- **Alineación**: `class="slide left"` para slides narrativas; centrado para frases grandes.
- **Textura del fondo**: un `radial-gradient` suave, líneas de cuaderno, o una cuadrícula de plano con `background-image`.
- **Temblor** (solo estilo a mano): `scale` del filtro `#rough` (1 sutil – 5 muy marcado) y `baseFrequency` (0.02 suave – 0.06 nervioso). Para línea limpia, `--art-filter: none`.
- **Ritmo**: `--draw-time`, `--stagger`, `--fade`. Charla tranquila → lento; charla enérgica → rápido.
