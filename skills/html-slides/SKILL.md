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
