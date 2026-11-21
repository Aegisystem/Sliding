# Skill html-slides: presentaciones HTML con tu IA

Esta skill le enseña a tu IA a crear presentaciones de un solo archivo HTML, con ilustraciones animadas y notas para quien presenta. El resultado se sube tal cual a Sliding (https://sliding.aegisystem.xyz) y se presenta con el celular como control.

## Cómo usarla

Pégale todo este texto a tu IA, junto con este pedido:

> Crea la skill «html-slides» con los archivos de abajo, respetando sus rutas, y úsala cuando te pida una presentación.

- **Claude** la guarda como skill y la usa sola cuando le pidas una presentación.
- **Otra IA** puede usar SKILL.md como instrucciones y assets/template.html como punto de partida.

Después pídele, por ejemplo: «Haz una presentación sobre la fotosíntesis para estudiantes de primer año, con notas para mí en cada diapositiva». Antes de armarla, tu IA te mostrará tres opciones de diseño (la primera con fondo claro) y esperará a que elijas una.

## Publicar en Sliding

Cuando la presentación esté lista, no hace falta desplegarla: entra a https://sliding.aegisystem.xyz/panel, sube el archivo .html y toca «Presentar con control». Las notas de cada diapositiva aparecen en tu celular, nunca en la pantalla del público.

---

Los 6 archivos de la skill, cada uno con su ruta:

## html-slides/SKILL.md

`````markdown
---
name: html-slides
description: Presentaciones HTML de un solo archivo con ilustraciones SVG animadas (a mano, línea limpia, planas o diagramas) y un momento animado. Úsala cuando pidan diapositivas/slides/presentación en HTML, slides para GitHub Pages, o slides para una charla o TED talk.
---

# HTML Slides

Un deck es un solo `index.html` (sin build, publicable tal cual en GitHub Pages) donde cada slide lleva una idea, poco texto grande y, cuando suma, una ilustración SVG que aparece animada al entrar. El motor es fijo; el **diseño** (fondo, paleta, fuentes, tipo de ilustración, ritmo) cambia en cada presentación y lo elige el usuario entre las opciones que le propones.

Archivos de la skill (rutas relativas a esta carpeta):
- `assets/template.html` — el motor (navegación, notas del orador, animaciones de trazo/pop/rise, filtro a mano opcional) con un ejemplo de cada layout.
- `references/design.md` — principios, estilos de ilustración y direcciones visuales.
- `references/drawings.md` — cómo construir ilustraciones animadas, biblioteca de motivos, momento firma.
- `scripts/fit-check.js` — revisor de layout (pantalla, cajas, textos SVG, letra chica).
- `scripts/contrast.py` — contraste de los colores del tema.

## Pasos

1. **Guion en ideas.** Del contenido del usuario (o del guion de la charla) saca la lista de slides: una idea cada una, ~15 palabras visibles como máximo, lo demás en notas. Carga la skill `texto-sencillo` y adáptala a slides:
   - **Texto que explica** (subtítulos, etiquetas, tarjetas, pasos, notas): sigue sus reglas. Cada frase es un hecho que el público puede usar o comprobar ("Un objeto tiene datos y acciones"), y el título nombra el contenido ("Atributos y métodos").
   - **Frases memorables**: una charla necesita unas pocas frases que la gente recuerde ("La clase es el plano. El objeto, la casa."). Van en la portada, en la idea central y en el cierre, unas 3 por deck. Cada una resume algo que otra slide o la nota explica con hechos; aquí se permiten metáforas, paralelismos y el contraste "X, no Y".

   Listo cuando cada slide cabe en una frase, las frases memorables están solo donde la charla las necesita y cada una tiene detrás una explicación concreta, y el recorrido completo cuenta la historia sin el orador.

2. **Opciones de diseño.** Lee `references/design.md` y propón **3 opciones** para esta charla, distintas de verdad entre sí: fondo, paleta, fuentes, estilo de ilustración y ritmo. **La opción 1 tiene fondo claro**; las otras exploran, por ejemplo, un fondo oscuro o de color. Si el usuario pidió un estilo, las tres son variantes de ese estilo, y la 1 es su versión de fondo claro. Marca una como recomendada y di en una frase por qué encaja con la charla. Comprueba con `contrast.py` los cuatro colores de cada opción, arma la vista previa (sección «Vista previa de las opciones» de `design.md`) y muéstrasela.

   Luego **detente y espera su respuesta**. Puede elegir una, mezclarlas («el fondo de la 1 con las fuentes de la 3») o pedir otras; si cambia algo, muestra la vista previa de nuevo. Si te dice que decidas tú, usa la recomendada y avísale cuál es. Listo cuando el usuario eligió un diseño (o te dejó decidir) y `contrast.py` da OK para sus cuatro colores.

3. **Armar el deck.** Copia `assets/template.html` al proyecto como `index.html`, pon el diseño elegido en `:root` (incluido `--art-filter`) y en el `<link>` de fuentes, borra las slides de ejemplo y escribe las tuyas alternando layouts (`big`, `split`, `grid`, `row`, cita). Listo cuando todas las slides del paso 1 están escritas y no hay tres seguidas con el mismo layout.

4. **Ilustraciones.** Lee `references/drawings.md`. Ilustra en el estilo elegido cada slide que tenga una metáfora clara y diseña **un** momento firma animado ligado a la idea central. Listo cuando cada ilustración se puede explicar en una frase y el momento firma existe.

5. **Verificar en el navegador.** Abre el archivo a 1280×720 y corre `scripts/fit-check.js`: revisa cada slide y reporta lo que se sale de la pantalla, lo que desborda su caja o columna, textos SVG que cruzan el borde de un recuadro o se pisan, y letra de menos de 16 px. Corrige y vuelve a correrlo hasta que diga OK; repite a 1024×768. Después mira con captura cada slide que tenga ilustración, porque el script no ve si un dibujo se entiende. Listo cuando el script da OK en los dos tamaños y viste todas las slides con ilustración.

6. **Publicar** (solo si el usuario lo pide). En un repo de GitHub: commit de `index.html`, push a `main` y activa Pages desde `main` `/ (root)` (`gh api -X POST repos/<owner>/<repo>/pages -f 'source[branch]=main' -f 'source[path]=/'`). Listo cuando la URL pública devuelve el `<title>` del deck.

## Atajos del motor (díselos al usuario)

← → / espacio / clic / deslizar para avanzar · **F** pantalla completa · **N** notas del orador · `#5` en la URL abre la slide 5.
`````

## html-slides/assets/template.html

`````html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Título de la charla</title>
<meta name="description" content="Una línea sobre la charla.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<!-- THEME: cambia las fuentes por la dirección visual elegida (references/design.md) -->
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,500;1,6..72,300&family=Atkinson+Hyperlegible:wght@400;700&display=swap" rel="stylesheet">
<style>
  /* ================= THEME (lo único que cambia entre presentaciones) ================= */
  :root {
    --bg: #eaf1ef;          /* fondo */
    --fg: #1d2a2b;          /* texto principal  (≥ 7:1 sobre --bg) */
    --muted: #4f5f5c;       /* texto secundario (≥ 4.5:1) */
    --accent: #25685a;      /* lo importante    (≥ 4.5:1) */
    --soft: rgba(37, 104, 90, 0.10);
    --display: "Newsreader", Georgia, serif;          /* títulos */
    --text: "Atkinson Hyperlegible", system-ui, sans-serif; /* texto chico */
    --display-weight: 300;
    --art-filter: url(#rough); /* estilo de ilustración: url(#rough) = a mano · none = línea limpia */
    --stroke: 2.4;          /* grosor de los dibujos */
    --draw-time: 1.3s;      /* cuánto tarda cada trazo */
    --stagger: .25s;        /* espera entre trazos (--i) */
    --fade: .7s;            /* transición entre slides */
  }

  /* ================= ENGINE (no hace falta tocar) ================= */
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; overflow: hidden; }
  body { background: var(--bg); color: var(--fg); font-family: var(--text); -webkit-font-smoothing: antialiased; user-select: none; }

  .slide {
    position: absolute; inset: 0;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    text-align: center; padding: 6vh 8vw;
    opacity: 0; visibility: hidden; transition: opacity var(--fade) ease, visibility var(--fade);
  }
  .slide.active { opacity: 1; visibility: visible; }
  .slide.left { align-items: flex-start; text-align: left; }

  /* ---- type scale: tamaños pensados para leerse desde el fondo de una sala ---- */
  h1, h2, h3, .big, blockquote { font-family: var(--display); font-weight: var(--display-weight); line-height: 1.1; }
  h1 { font-size: clamp(3rem, 9vw, 7.5rem); letter-spacing: -0.02em; }
  h2 { font-size: clamp(2.4rem, 6.5vw, 5.5rem); letter-spacing: -0.01em; max-width: 20ch; }
  .big { font-size: clamp(2.6rem, 8vw, 6.5rem); max-width: 16ch; }
  .sub { margin-top: 1.6rem; font-size: clamp(1.25rem, 2.8vw, 2rem); color: var(--muted); max-width: 40ch; line-height: 1.5; }
  .label { font-size: clamp(.95rem, 1.8vw, 1.25rem); letter-spacing: .2em; text-transform: uppercase; color: var(--accent); margin-bottom: 1.4rem; font-weight: 700; }
  em { font-style: italic; color: var(--accent); }
  .strike { text-decoration: line-through; text-decoration-color: var(--accent); text-decoration-thickness: 3px; color: var(--muted); }
  blockquote { font-style: italic; font-size: clamp(2.2rem, 5.6vw, 4.6rem); max-width: 20ch; line-height: 1.2; }
  cite { display: block; margin-top: 2rem; font-style: normal; color: var(--muted); letter-spacing: .15em; text-transform: uppercase; font-size: clamp(1rem, 1.8vw, 1.3rem); }

  /* ---- layouts ---- */
  .grid { display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); gap: clamp(1rem, 3vw, 2.5rem); margin-top: 2.2rem; max-width: 1100px; width: 100%; }
  .card { text-align: left; border-top: 1px solid var(--muted); padding-top: 1rem; display: flex; flex-direction: column; }
  .card .art.sm { align-self: flex-start; }
  .card h3 { font-weight: 500; font-size: clamp(1.6rem, 3.2vw, 2.6rem); }
  .card p { margin-top: .5rem; font-size: clamp(1.15rem, 2.2vw, 1.55rem); line-height: 1.45; }
  .card .quiet { color: var(--muted); font-family: var(--display); font-style: italic; }
  .card .strong { color: var(--accent); font-weight: 700; }

  .row { display: flex; align-items: center; gap: clamp(.6rem, 2vw, 2rem); margin-top: 2.4rem; flex-wrap: wrap; justify-content: center; }
  .row .node { font-family: var(--display); font-size: clamp(1.5rem, 3.8vw, 3rem); font-weight: var(--display-weight); }
  .row .pill { padding: .5em 1.1em; border-radius: 999px; background: var(--soft); color: var(--accent); border: 1px solid var(--accent); }
  .row .arrow { color: var(--muted); font-size: clamp(1rem, 2.5vw, 2rem); }

  .split { display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 5vw; width: 100%; max-width: 1200px; text-align: left; }
  .split .art { height: clamp(140px, 42vh, 380px); margin: 0; justify-self: center; }

  /* ---- dibujos SVG ---- */
  .art {
    height: clamp(70px, 16vh, 170px); width: auto; max-width: 100%; margin-bottom: clamp(1rem, 3vh, 2rem);
    overflow: visible; filter: var(--art-filter, none);
    fill: none; stroke: var(--fg); stroke-width: var(--stroke); stroke-linecap: round; stroke-linejoin: round;
  }
  .art.sm { height: clamp(48px, 9vh, 80px); margin-bottom: .8rem; }
  .art.wide { height: clamp(150px, 30vh, 280px); }  /* diagramas anchos o con texto adentro */
  .art .a { stroke: var(--accent); }
  .art .m { stroke: var(--muted); }
  .art .fill { fill: var(--accent); stroke: none; }
  .art .ink { fill: var(--fg); stroke: none; }
  .art .solid { fill: var(--accent); stroke: none; }   /* formas planas rellenas */
  .art .tint { fill: var(--soft); stroke: none; }      /* formas de fondo suaves */
  .art .ground { fill: var(--fg); stroke: none; }
  .art text { stroke: none; fill: var(--bg); font-family: var(--text); font-weight: 700; font-size: 11px; }

  /* draw-on: elementos con class="d" y pathLength="1"; --i ordena los trazos */
  .art .d { stroke-dasharray: 1; stroke-dashoffset: 1; }
  .slide.active .art .d { animation: draw var(--draw-time) ease forwards; animation-delay: calc(.3s + var(--i, 0) * var(--stagger)); }
  @keyframes draw { to { stroke-dashoffset: 0; } }
  /* fade-in para rellenos y texto dentro del SVG: class="f" */
  .art .f { opacity: 0; }
  .slide.active .art .f { animation: fadein .6s ease forwards; animation-delay: calc(.3s + var(--i, 0) * var(--stagger)); }
  @keyframes fadein { to { opacity: 1; } }
  /* pop: formas rellenas que crecen desde su centro: class="p" */
  .art .p { opacity: 0; transform: scale(.4); transform-box: fill-box; transform-origin: center; }
  .slide.active .art .p { animation: pop .7s cubic-bezier(.2, 1.4, .4, 1) forwards; animation-delay: calc(.3s + var(--i, 0) * var(--stagger)); }
  @keyframes pop { to { opacity: 1; transform: none; } }
  /* aparición de bloques HTML en orden: class="rise" style="--i:n" */
  .rise { opacity: 0; transform: translateY(12px); }
  .slide.active .rise { animation: rise .7s ease forwards; animation-delay: calc(.2s + var(--i, 0) * var(--stagger)); }
  @keyframes rise { to { opacity: 1; transform: none; } }

  /* ---- notas del orador (tecla N) ---- */
  .notes { display: none; }
  body.show-notes .slide.active .notes {
    display: block; position: fixed; left: 16px; right: 16px; bottom: 40px; max-height: 30vh; overflow: auto;
    background: var(--fg); color: var(--bg); padding: 1rem 1.2rem; border-radius: 8px;
    font-size: 1rem; line-height: 1.5; text-align: left; z-index: 20;
  }

  /* ---- chrome ---- */
  .progress { position: fixed; left: 0; bottom: 0; height: 3px; background: var(--accent); transition: width .5s ease; z-index: 10; }
  .counter { position: fixed; right: 20px; bottom: 16px; font-size: .8rem; color: var(--muted); letter-spacing: .1em; z-index: 10; }
  .hint { position: fixed; left: 20px; bottom: 16px; font-size: .8rem; color: var(--muted); z-index: 10; transition: opacity 1s; }
  .nav { position: fixed; top: 0; bottom: 0; z-index: 5; cursor: pointer; }
  .nav.prev { left: 0; width: 30%; } .nav.next { right: 0; width: 70%; }

  @media (max-width: 700px) {
    .grid, .split { grid-template-columns: 1fr; gap: 1rem; }
    .grid .art.sm { display: none; }
    .row { flex-direction: column; }
    .slide { padding: 6vh 16px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .slide { transition: none; }
    .art .d { stroke-dashoffset: 0; } .art .f, .art .p, .rise { opacity: 1; transform: none; }
    .slide.active .art .d, .slide.active .art .f, .slide.active .art .p, .slide.active .rise { animation: none; }
  }
</style>
</head>
<body>

<!-- Filtro "dibujado a mano": scale 0 = líneas perfectas, 2–3 = boceto, 5+ = muy tembloroso -->
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <filter id="rough">
    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4"/>
    <feDisplacementMap in="SourceGraphic" scale="2.6"/>
  </filter>
</svg>

<!-- ============ SLIDES DE EJEMPLO: reemplázalas. Muestran cada layout. ============ -->

<!-- Portada -->
<section class="slide">
  <svg class="art" viewBox="0 0 200 90" aria-hidden="true">
    <path class="d" pathLength="1" style="--i:0" d="M10 70 H82 M118 70 H190"/>
    <path class="d a" pathLength="1" style="--i:1" d="M78 70 A22 22 0 0 1 122 70"/>
  </svg>
  <div class="label">Etiqueta</div>
  <h1>Título</h1>
  <p class="sub">Subtítulo en una línea</p>
  <aside class="notes">Notas del orador: solo se ven al presionar N.</aside>
</section>

<!-- Frase grande -->
<section class="slide">
  <p class="big">Una idea.<br><em>Una slide.</em></p>
</section>

<!-- Dibujo + texto lado a lado -->
<section class="slide">
  <div class="split">
    <div>
      <div class="label">Layout split</div>
      <h2>El dibujo cuenta la mitad.</h2>
      <p class="sub">Texto a un lado, metáfora visual al otro.</p>
    </div>
    <svg class="art" viewBox="0 0 120 120" aria-hidden="true">
      <circle class="d m" pathLength="1" style="--i:0" cx="60" cy="60" r="50"/>
      <circle class="d a" pathLength="1" style="--i:1" cx="60" cy="60" r="22"/>
      <circle class="fill f" style="--i:2" cx="60" cy="60" r="6"/>
    </svg>
  </div>
</section>

<!-- Ilustración plana: formas rellenas con "pop" (sin filtro a mano en esta slide) -->
<section class="slide">
  <svg class="art" viewBox="0 0 200 110" aria-hidden="true" style="filter:none">
    <rect class="tint p" style="--i:0" x="10" y="10" width="180" height="90" rx="12"/>
    <rect class="solid p" style="--i:1" x="34" y="66" width="26" height="24" rx="4"/>
    <rect class="solid p" style="--i:2" x="76" y="50" width="26" height="40" rx="4"/>
    <rect class="solid p" style="--i:3" x="118" y="34" width="26" height="56" rx="4"/>
    <circle class="ground p" style="--i:4" cx="164" cy="26" r="8"/>
  </svg>
  <div class="label">Estilo plano</div>
  <h2>Formas rellenas que aparecen.</h2>
</section>

<!-- Proceso en fila -->
<section class="slide">
  <h2>Antes → durante → después</h2>
  <div class="row">
    <span class="node rise" style="--i:0">Antes</span><span class="arrow rise" style="--i:1">→</span>
    <span class="node pill rise" style="--i:2">el centro</span><span class="arrow rise" style="--i:3">→</span>
    <span class="node rise" style="--i:4">Después</span>
  </div>
</section>

<!-- Tarjetas (cambia --cols para 2 o 4) -->
<section class="slide">
  <h2>Tres ejemplos</h2>
  <div class="grid" style="--cols:3">
    <div class="card rise" style="--i:0"><h3>Uno</h3><p class="quiet">"Lo que alguien dice."</p><p class="strong">Lo que haces.</p></div>
    <div class="card rise" style="--i:1"><h3>Dos</h3><p class="quiet">"Lo que alguien dice."</p><p class="strong">Lo que haces.</p></div>
    <div class="card rise" style="--i:2"><h3>Tres</h3><p class="quiet">"Lo que alguien dice."</p><p class="strong">Lo que haces.</p></div>
  </div>
</section>

<!-- Cita -->
<section class="slide">
  <blockquote>"Una cita corta y verificada."</blockquote>
  <cite>Autor</cite>
</section>

<div class="nav prev" aria-hidden="true"></div>
<div class="nav next" aria-hidden="true"></div>
<div class="progress"></div>
<div class="counter"></div>
<div class="hint">← → para avanzar · F pantalla completa · N notas</div>

<script>
  const slides = [...document.querySelectorAll('.slide')];
  const progress = document.querySelector('.progress');
  const counter = document.querySelector('.counter');
  const hint = document.querySelector('.hint');
  let i = 0;

  function show(n) {
    i = Math.max(0, Math.min(slides.length - 1, n));
    slides.forEach((s, k) => s.classList.toggle('active', k === i));
    progress.style.width = ((i + 1) / slides.length * 100) + '%';
    counter.textContent = (i + 1) + ' / ' + slides.length;
    try { history.replaceState(null, '', '#' + (i + 1)); } catch (e) {}
    if (i > 0) hint.style.opacity = 0;
    document.dispatchEvent(new CustomEvent('slidechange', { detail: { index: i, slide: slides[i] } }));
  }

  document.addEventListener('keydown', e => {
    if (['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'Enter'].includes(e.key)) { e.preventDefault(); show(i + 1); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); show(i - 1); }
    else if (e.key === 'Home') show(0);
    else if (e.key === 'End') show(slides.length - 1);
    else if (e.key === 'n' || e.key === 'N') document.body.classList.toggle('show-notes');
    else if (e.key === 'f' || e.key === 'F') {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.();
    }
  });
  document.querySelector('.nav.next').addEventListener('click', () => show(i + 1));
  document.querySelector('.nav.prev').addEventListener('click', () => show(i - 1));

  let tx = null;
  document.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', e => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1));
    tx = null;
  });

  // Momento firma: escucha 'slidechange' para reiniciar animaciones propias al entrar a una slide.
  // document.addEventListener('slidechange', e => { if (e.detail.slide.id === 'mi-slide') { ... } });

  show(parseInt(location.hash.slice(1), 10) - 1 || 0);
</script>
</body>
</html>
`````

## html-slides/references/design.md

`````markdown
# Dirección visual

El motor es el mismo; la **forma** cambia en cada presentación. Cada opción que propones al usuario (paso 2 de SKILL.md) es una dirección completa según el tono de la charla: fondo, paleta, fuentes, grosor de trazo, nivel de temblor y ritmo de la animación.

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

Úsalas como punto de partida y mézclalas; no repitas la misma dirección en dos presentaciones seguidas. Las de fondo claro, para la opción 1, son Calma, Cuaderno, Póster y Editorial.

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

## Vista previa de las opciones

Arma `opciones.html`, un archivo aparte y sin el motor que solo sirve para elegir; no es parte de la presentación. Lleva las tres portadas una debajo de otra, cada una en una caja 16:9 con:

- encima de la caja, el número y el nombre de la opción, y «recomendada» en la que corresponde;
- su fondo (con textura si la tiene), sus fuentes y sus colores;
- el título real de la charla con la palabra clave en `<em>` y el subtítulo en `--muted`;
- un dibujo chico en su estilo de ilustración, o la palabra como imagen si es tipográfico.

Carga las fuentes de las tres en un solo `<link>` de Google Fonts. Ábrelo en el navegador y muestra una captura de cada caja; si no tienes navegador, entrégale el archivo al usuario para que lo abra. En el chat, junto a la vista previa, escribe una línea por opción: número, nombre, fondo, colores en hex, fuentes, ilustración y ritmo. Así puede contestar «la 2» o mezclar partes.
`````

## html-slides/references/drawings.md

`````markdown
# Dibujos SVG

El estilo (a mano, línea limpia, plano, mixto, diagrama o sin dibujos) se elige en `design.md`; esta guía cubre cómo construir cualquiera de ellos.

Cada dibujo es una **metáfora** de la idea de la slide, no decoración. Si no puedes decir en una frase qué significa el dibujo ("la montaña es el problema entero; los escalones, el siguiente paso"), la slide va sin dibujo.

## Anatomía

```html
<svg class="art" viewBox="0 0 200 100" aria-hidden="true">
  <path   class="d"   pathLength="1" style="--i:0" d="..."/>  <!-- trazo principal, color --fg -->
  <path   class="d a" pathLength="1" style="--i:1" d="..."/>  <!-- trazo de acento -->
  <path   class="d m" pathLength="1" style="--i:0" d="..."/>  <!-- trazo de fondo/contexto -->
  <circle class="fill f" style="--i:2" cx=".." cy=".." r=".."/> <!-- relleno que aparece con fade -->
  <text   class="f" style="--i:2" x=".." y=".." text-anchor="middle">fear</text>
</svg>
```

- **`pathLength="1"` + `class="d"`** en todo trazo que deba dibujarse solo. Sirve en `path`, `circle`, `ellipse`, `rect`, `line`, `polyline`.
- **`--i`** es el orden: 0 primero, luego 1, 2… Cuenta la historia en el orden en que la dirías ("la nube… luego la etiqueta").
- **Rellenos y texto** usan `class="f"` (fade), porque no tienen trazo que dibujar.
- **Contexto en `m`, protagonista en `a`.** Un solo elemento de acento por dibujo es lo más fuerte.
- `class="art sm"` para íconos pequeños dentro de tarjetas; `class="art wide"` para diagramas anchos o con texto adentro.
- Un trazo que debe quedar punteado no lleva `d` (la animación usa `stroke-dasharray`): ponle `stroke-dasharray="4 5"` sin `class="d"`.

**Estilo plano** (formas rellenas, sin trazo): usa `solid` (acento), `tint` (fondo suave) o `ground` (color del texto), más `class="p"` para que crezcan desde su centro:

```html
<rect   class="tint p"   style="--i:0" x="10" y="10" width="180" height="90" rx="12"/>
<circle class="solid p"  style="--i:1" cx="60" cy="55" r="20"/>
<path   class="d a" pathLength="1" style="--i:2" d="..."/>  <!-- mixto: una línea encima -->
```

Las formas planas se construyen con primitivas (`rect` con `rx`, `circle`, triángulos con `path`) y se superponen; piensa en recortes de papel. El filtro global se desactiva con `--art-filter: none`, o en un solo SVG con `style="filter:none"`.

## Texto dentro de un dibujo

El tamaño real de un `<text>` en pantalla es su `font-size` multiplicado por la escala del SVG (alto en pantalla ÷ alto del `viewBox`). Un diagrama ancho dentro de `.art` normal se encoge y su texto queda ilegible.

- **Mínimo 16 px reales.** Si `fit-check.js` marca LETRA CHICA, usa `class="art wide"`, achica el `viewBox` o sube el `font-size`.
- **Cada texto queda dentro de su recuadro o fuera de él**, nunca sobre el borde. Calcula el ancho: en fuentes mono cada carácter mide unos 0.6 × `font-size`; deja 10 unidades de margen a cada lado. Si no cabe, agranda el `rect` o acorta el texto.
- **Un texto por línea y sin pisarse**: deja al menos 1.4 × `font-size` entre líneas.

## Reglas de trazo

- **2 a 6 elementos** por dibujo. Más que eso compite con el texto.
- Coordenadas redondas, curvas con `Q` (cuadráticas): se ven más a mano que las Bézier perfectas.
- `viewBox` ajustado al dibujo (sin márgenes vacíos grandes); el tamaño lo controla CSS.
- Formas abiertas > formas cerradas perfectas. Una línea que no cierra del todo se siente humana.

## Biblioteca de motivos

Puntos de partida probados. Adáptalos: cambia proporciones, combina dos, rómpelos.

| Motivo | Significa | Trazo |
|---|---|---|
| Horizonte con hueco + sol | pausa, espacio, nuevo comienzo | `M10 70 H82 M118 70 H190` + `M78 70 A22 22 0 0 1 122 70` |
| Camino en perspectiva | viaje, accidente, decisión | `M8 42 H192` (horizonte) · `M40 116 L94 42` · `M160 116 L106 42` · línea central discontinua en tramos cortos |
| Nube | emoción, confusión | `M44 76 Q22 76 22 60 Q22 44 40 46 Q44 26 66 28 Q84 16 100 34 Q124 30 126 52 Q144 56 140 70 Q136 78 122 76 Z` |
| Rayo | estrés, alarma | `M34 54 L28 66 H38 L32 78` |
| Sol | calma, claridad | `circle r12` + 8 rayos cortos |
| Corazón + latido | cuerpo, emoción | `M60 88 C20 60 10 40 26 24 C38 12 54 18 60 32 C66 18 82 12 94 24 C110 40 100 60 60 88 Z` + `M22 50 H40 L46 36 L54 64 L60 44 L66 54 H76 Q86 50 98 50` |
| Viento | respiración, cambio | `M12 30 H110 Q132 30 132 14 Q132 2 119 2 Q107 3 109 15` (repite con otro largo) |
| Montaña vs escalones | problema grande vs siguiente paso | `M6 102 L66 18 L92 52 L108 34 L150 102` (m) + `M150 102 H164 V90 H178 V78 H192 V66 H206` (a) |
| Círculos concéntricos | control, foco, lo que importa | `circle r50` (m) + `circle r22` (a) + punto relleno |
| Pausa ‖ | detenerse | `circle r50` (m) + dos líneas verticales gruesas (a) |
| Huellas | avanzar, después | elipses `rx6 ry3.5` rotadas siguiendo una curva |
| Burbujas de diálogo | conversación, pareja | dos rectángulos redondeados con cola, el segundo en `a` |
| Casa | familia, padres | `M14 30 L46 6 L78 30` + `M22 24 V56 H70 V24` + puerta en `a` |
| Teléfono + notificación | mensaje, presión | `rect rx6` + dos líneas de texto + círculo relleno arriba a la derecha |
| Sobre | email, trabajo | `rect` + `M14 33 L50 58 L86 33` |
| León | amenaza antigua | melena: `circle r36 stroke-width=7 stroke-dasharray="4 5"` (sin `d`) + cara `circle r24` + ojos/nariz |
| Onda | una respiración, ritmo | `M6 40 Q40 4 74 30 Q100 50 130 36 Q160 22 194 30` |
| Flecha que se curva | cambio de rumbo | `M10 80 Q60 80 80 50 Q100 20 150 20` + punta `M140 12 L152 20 L140 28` |
| Semilla → brote | crecimiento | `ellipse` pequeña + `M60 90 Q60 60 60 40` + dos hojas con `Q` |
| Puente | conexión, transición | `M10 70 Q100 10 190 70` + pilares verticales |

## Momento firma

Cada presentación lleva **un** momento animado que encarna la idea central (en *One Breath* fue un círculo que respira con el público). Ideas: un temporizador que cuenta 10 segundos de silencio, una línea que se dibuja mientras hablas, un contador que sube, una balanza que se equilibra. Hazlo con CSS `@keyframes` y, si necesita sincronía con texto, reinícialo en el evento `slidechange` del motor.
`````

## html-slides/scripts/contrast.py

`````python
"""Contraste WCAG de los colores del tema.

Uso: python3 contrast.py <bg> <fg> <muted> <accent>     (hex sin #)
Ejemplo: python3 contrast.py eaf1ef 1d2a2b 4f5f5c 25685a
"""
import sys


def lum(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    c = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def ratio(a, b):
    hi, lo = sorted([lum(a), lum(b)], reverse=True)
    return (hi + 0.05) / (lo + 0.05)


bg, fg, muted, accent = [x.lstrip('#') for x in sys.argv[1:5]]
ok = True
for name, col, need in [("fg", fg, 7.0), ("muted", muted, 4.5), ("accent", accent, 4.5)]:
    r = ratio(col, bg)
    passed = r >= need
    ok &= passed
    print(f"{name:7} {r:5.2f}:1  (mínimo {need})  {'OK' if passed else 'SUBE EL CONTRASTE'}")
sys.exit(0 if ok else 1)
`````

## html-slides/scripts/fit-check.js

`````javascript
// Revisor de layout para un deck html-slides.
// Pégalo en la consola (o en la herramienta javascript del navegador) con la ventana a
// 1280x720 y vuelve a correrlo a 1024x768. Devuelve "OK" o una lista de problemas por slide.
//
// Revisa, en cada slide:
//   1. FUERA DE PANTALLA  algo se sale por arriba, por los lados o tapa la barra inferior.
//   2. DESBORDE           un bloque HTML (tarjeta, código, título) tiene contenido más ancho o alto que su caja.
//   3. CRUZA BORDE        un texto SVG cruza el borde de un rect del mismo dibujo (debe quedar dentro o fuera).
//   4. CHOQUE             dos textos SVG del mismo dibujo se pisan.
//   5. LETRA CHICA        texto visible con menos de 16 px reales en pantalla.
(async () => {
  const MIN_PX = 16, BOTTOM_BAR = 30, TOL = 1;
  // Congela animaciones en su estado final para medir el layout real.
  const freeze = document.createElement('style');
  freeze.textContent = `.slide{visibility:visible!important}
    .art .d{stroke-dashoffset:0!important;animation:none!important}
    .art .p,.art .f,.rise{opacity:1!important;transform:none!important;animation:none!important}`;
  document.head.appendChild(freeze);
  await new Promise(r => setTimeout(r, 300));

  const H = innerHeight, W = innerWidth, report = [];
  const inter = (a, b) => a.x < b.x + b.width - TOL && b.x < a.x + a.width - TOL && a.y < b.y + b.height - TOL && b.y < a.y + a.height - TOL;
  const inside = (a, b) => a.x >= b.x - TOL && a.y >= b.y - TOL && a.x + a.width <= b.x + b.width + TOL && a.y + a.height <= b.y + b.height + TOL;
  const short = el => (el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
  // Caja de un elemento SVG en coordenadas del <svg> raíz (incluye transforms de grupos).
  const boxIn = (el, svg) => {
    const b = el.getBBox(), m = svg.getScreenCTM().inverse().multiply(el.getScreenCTM());
    const pts = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]
      .map(([x, y]) => new DOMPoint(x, y).matrixTransform(m));
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  };

  document.querySelectorAll('.slide').forEach((s, k) => {
    const issues = [];
    const els = [...s.querySelectorAll('*')].filter(e => !e.closest('.notes'));

    // 1. fuera de pantalla
    els.forEach(e => {
      const b = e.getBoundingClientRect();
      if (!b.width || !b.height) return;
      if (b.top < 0 || b.left < 0 || b.right > W || b.bottom > H - BOTTOM_BAR)
        issues.push(`FUERA DE PANTALLA: <${e.tagName.toLowerCase()}> "${short(e)}"`);
    });

    // 2. desborde horizontal de bloques HTML (palabras o código más anchos que su caja)
    s.querySelectorAll('h1,h2,h3,p,pre,.card,.big,.sub,blockquote,.grid,.split,.row').forEach(e => {
      if (e.closest('.notes')) return;
      if (e.scrollWidth > e.clientWidth + 2)
        issues.push(`DESBORDE: <${e.tagName.toLowerCase()}> "${short(e)}"`);
    });

    // 3–5. dibujos SVG
    s.querySelectorAll('svg.art').forEach(svg => {
      const texts = [...svg.querySelectorAll('text')].map(t => ({ t, b: boxIn(t, svg) }));
      const rects = [...svg.querySelectorAll('rect')].map(r => boxIn(r, svg));
      texts.forEach(({ t, b }) => {
        if (rects.some(r => inter(b, r) && !inside(b, r)))
          issues.push(`CRUZA BORDE: texto SVG "${short(t)}"`);
        const px = t.getBoundingClientRect().height * 0.8;
        if (px < MIN_PX) issues.push(`LETRA CHICA: texto SVG "${short(t)}" ≈ ${px.toFixed(0)}px`);
      });
      for (let a = 0; a < texts.length; a++)
        for (let c = a + 1; c < texts.length; c++)
          if (inter(texts[a].b, texts[c].b))
            issues.push(`CHOQUE: "${short(texts[a].t)}" con "${short(texts[c].t)}"`);
    });

    // 5. letra chica en HTML (una línea por bloque, no por cada <span>)
    els.forEach(e => {
      if (e.closest('svg') || ![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
      const px = parseFloat(getComputedStyle(e).fontSize);
      const parentPx = parseFloat(getComputedStyle(e.parentElement).fontSize);
      if (px < MIN_PX && !(parentPx < MIN_PX && e.parentElement.closest('.slide')))
        issues.push(`LETRA CHICA: "${short(e)}" ${px.toFixed(0)}px`);
    });

    if (issues.length) report.push(`Slide ${k + 1}:\n  - ` + [...new Set(issues)].join('\n  - '));
  });

  freeze.remove();
  return report.length ? report.join('\n') + `\n(viewport ${W}x${H})` : `OK: ninguna slide con problemas (viewport ${W}x${H})`;
})();
`````
