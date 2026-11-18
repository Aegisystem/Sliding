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
