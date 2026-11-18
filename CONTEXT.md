# Sliding

Sitio donde las personas suben presentaciones en HTML para publicarlas sin desplegar nada, y las presentan moviéndolas desde el celular, donde leen sus notas.

## Lenguaje

### Presentaciones

**Presentación**:
Un archivo HTML de diapositivas que una persona subió al sitio. Tiene un enlace estable.
_Evitar_: deck, slides, archivo

**Diapositiva**:
Una de las pantallas de una presentación, con una sola idea.
_Evitar_: slide, diapo, página, lámina

**Presentación html-slides**:
Presentación hecha con la skill html-slides. El sitio conoce su estructura, así que la controla por completo y lee sus notas.

**Presentación genérica**:
Cualquier presentación que no es html-slides. Solo admite control básico: anterior y siguiente, sin notas ni contador.
_Evitar_: presentación externa, presentación libre

**Dueño**:
La persona con cuenta que subió una presentación y la administra.
_Evitar_: autor, creador, usuario

**Enlace de la presentación**:
Dirección no listada para ver una presentación, sin las notas y sin opción de presentarla. Quien no la tiene no puede encontrar la presentación.
_Evitar_: enlace del deck, enlace público, URL compartida

**Enlace para presentar**:
Dirección secreta, que solo tiene el Dueño, que abre una Pantalla con su QR de control.
_Evitar_: enlace del presentador, enlace privado

**Carpeta**:
Un grupo con nombre de presentaciones y otras carpetas de un Dueño, por ejemplo un curso, una unidad o una semana. Cada presentación está en una sola carpeta o en ninguna.
_Evitar_: curso (es un uso de la carpeta), sección, directorio

**Enlace de la carpeta**:
Dirección no listada para ver una carpeta: sus presentaciones y subcarpetas, en el orden que les dio el Dueño y sin notas.
_Evitar_: enlace del curso, página del curso

**Notas del presentador**:
Texto que acompaña a una diapositiva y es para quien presenta, no para el público.
_Evitar_: notas del orador, apuntes

**Agente**:
Un programa, como Claude u otro asistente, que sube presentaciones en nombre de un Dueño.
_Evitar_: bot, integración, cliente

### Presentar

**Sesión en vivo**:
Cada vez que alguien presenta una presentación. Une una Pantalla con un Control.
_Evitar_: presentación (es el archivo), sala, room

**Pantalla**:
El navegador que muestra la presentación al público durante una Sesión en vivo, casi siempre el computador conectado al proyector.
_Evitar_: display, proyector, computador

**Control**:
El navegador desde el que el Presentador mueve la presentación y lee las notas, casi siempre su celular.
_Evitar_: control remoto, mando, vista del presentador

**QR de control**:
Código de un solo uso que muestra la Pantalla. El primer celular que lo escanea se convierte en el Control de esa Sesión en vivo.
_Evitar_: código de emparejamiento, QR de acceso, PIN

**Presentador**:
La persona que presenta una presentación en una Sesión en vivo.
_Evitar_: orador, ponente, expositor

**Público**:
Las personas que miran la Pantalla.
_Evitar_: audiencia, espectadores
