# Sliding

Sitio donde las personas suben decks en HTML para publicarlos sin desplegar nada, y los presentan moviéndolos desde el celular, donde leen sus notas.

## Lenguaje

### Decks

**Deck**:
Un archivo HTML de slides que una persona subió al sitio. Tiene un enlace estable.
_Evitar_: presentación, archivo

**Slide**:
Una de las pantallas de un deck, con una sola idea.
_Evitar_: diapositiva, página, lámina

**Deck html-slides**:
Deck hecho con la skill html-slides. El sitio conoce su estructura, así que lo controla por completo y lee sus notas.

**Deck genérico**:
Cualquier deck que no es html-slides. Solo admite control básico: anterior y siguiente, sin notas ni contador.
_Evitar_: deck externo, deck libre

**Dueño**:
La persona con cuenta que subió un deck y lo administra.
_Evitar_: autor, creador, usuario

**Enlace del deck**:
Dirección no listada para ver un deck, sin las notas y sin opción de presentarlo. Quien no la tiene no puede encontrar el deck.
_Evitar_: enlace público, URL compartida

**Enlace para presentar**:
Dirección secreta, que solo tiene el Dueño, que abre una Pantalla con su QR de control.
_Evitar_: enlace de presentador, enlace privado

**Notas del orador**:
Texto que acompaña a una slide y es para quien presenta, no para el público.
_Evitar_: notas del presentador, apuntes

**Agente**:
Un programa, como Claude u otro asistente, que sube decks en nombre de un Dueño.
_Evitar_: bot, integración, cliente

### Presentar

**Sesión en vivo**:
Cada vez que alguien presenta un deck. Une una Pantalla con un Control.
_Evitar_: presentación, sala, room

**Pantalla**:
El navegador que muestra el deck al público durante una Sesión en vivo, casi siempre el computador conectado al proyector.
_Evitar_: display, proyector, computador

**Control**:
El navegador desde el que el Orador mueve el deck y lee las notas, casi siempre su celular.
_Evitar_: control remoto, mando, vista del orador

**QR de control**:
Código de un solo uso que muestra la Pantalla. El primer celular que lo escanea se convierte en el Control de esa Sesión en vivo.
_Evitar_: código de emparejamiento, QR de acceso, PIN

**Orador**:
La persona que presenta un deck en una Sesión en vivo.
_Evitar_: presentador, ponente, expositor

**Público**:
Las personas que miran la Pantalla.
_Evitar_: audiencia, espectadores
