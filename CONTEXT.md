# Sliding

Sitio donde las personas suben presentaciones en HTML para publicarlas sin desplegar nada, y las presentan moviéndolas desde el celular, donde leen sus notas.

## Lenguaje

La interfaz está en español y en inglés (#10). Cada término dice cómo se nombra en inglés; los textos de los dos idiomas viven en `packages/core/src/i18n/`.

### Presentaciones

**Presentación**:
Un archivo HTML o PDF de diapositivas que una persona subió al sitio. Tiene un enlace estable.
_En inglés_: presentation
_Evitar_: deck, slides, archivo

**Diapositiva**:
Una de las pantallas de una presentación, con una sola idea.
_En inglés_: slide
_Evitar_: «slide» en un texto en español, diapo, página, lámina

**Presentación html-slides**:
Presentación hecha con la skill html-slides. El sitio conoce su estructura, así que la controla por completo y lee sus notas.
_En inglés_: html-slides presentation

**Presentación genérica**:
Cualquier presentación HTML que no es html-slides. Solo admite control básico: anterior y siguiente, sin notas ni contador.
_En inglés_: generic presentation
_Evitar_: presentación externa, presentación libre

**Presentación en PDF**:
Presentación subida como PDF, casi siempre exportada de PowerPoint, Keynote o Google Slides. Cada página es una diapositiva, así que el sitio la controla por completo. Sus notas llegan del `.pptx` si el Dueño lo agrega.
_En inglés_: PDF presentation
_Evitar_: presentación PowerPoint, PDF genérico

**Dueño**:
La persona con cuenta que subió una presentación y la administra.
_En inglés_: owner
_Evitar_: autor, creador, usuario

**Enlace de la presentación**:
Dirección no listada para ver una presentación, sin las notas y sin opción de presentarla. Quien no la tiene no puede encontrar la presentación.
_En inglés_: presentation link (en la interfaz, «share link»)
_Evitar_: enlace del deck, enlace público, URL compartida

**Enlace para presentar**:
Dirección secreta, que solo tiene el Dueño, que abre una Pantalla con su QR de control.
_En inglés_: presenting link
_Evitar_: enlace del presentador, enlace privado

**Carpeta**:
Un grupo con nombre de presentaciones y otras carpetas de un Dueño, por ejemplo un curso, una unidad o una semana. Cada presentación está en una sola carpeta o en ninguna.
_En inglés_: folder
_Evitar_: curso (es un uso de la carpeta), sección, directorio

**Enlace de la carpeta**:
Dirección no listada para ver una carpeta: sus presentaciones y subcarpetas, en el orden que les dio el Dueño y sin notas.
_En inglés_: folder link
_Evitar_: enlace del curso, página del curso

**Oculta**:
Una presentación o carpeta que no aparece en el Enlace de la carpeta que la contiene, y con ella lo que tenga dentro. El Dueño la muestra cuando quiere, por ejemplo al llegar la unidad en su curso. Lo nuevo llega oculto. Ocultar no apaga su propio enlace: quien ya lo tiene la sigue viendo.
_En inglés_: hidden (y «show» / «hide» para mostrar y ocultar)
_Evitar_: privada, borrador, no publicada

**Notas del presentador**:
Texto que acompaña a una diapositiva y es para quien presenta, no para el público.
_En inglés_: speaker notes
_Evitar_: notas del orador, apuntes

**Administrador**:
La persona que modera Sliding: desactiva y reactiva presentaciones y Dueños. Sliding la reconoce por el id de su cuenta.
_En inglés_: administrator
_Evitar_: admin, moderador, superusuario

**Desactivar**:
Lo que hace el Administrador con una presentación o un Dueño que abusa del sitio. Lo desactivado da 404 para todos, pero no se borra, y reactivarlo lo devuelve tal cual. Un Dueño desactivado no puede entrar, y sus presentaciones y carpetas tampoco se ven.
_En inglés_: disable (y «re-enable» para reactivar)
_Evitar_: bloquear, suspender, banear

**Agente**:
Un programa, como Claude u otro asistente, que sube presentaciones en nombre de un Dueño.
_En inglés_: agent
_Evitar_: bot, integración, cliente

**Clave para Agentes**:
Texto secreto que el Dueño crea en su panel, con un nombre como «Claude en mi Mac», y le da a un Agente para que suba presentaciones a su nombre. Sliding la muestra una sola vez, al crearla. Revocarla la deja sin efecto para siempre; no sirve para entrar a Sliding.
_En inglés_: agent key
_Evitar_: token, contraseña, API key

### Presentar

**Sesión en vivo**:
Cada vez que alguien presenta una presentación. Une una Pantalla con un Control.
_En inglés_: live session
_Evitar_: presentación (es el archivo), sala, room

**Pantalla**:
El navegador que muestra la presentación al público durante una Sesión en vivo, casi siempre el computador conectado al proyector.
_En inglés_: Screen
_Evitar_: display, proyector, computador

**Control**:
El navegador desde el que el Presentador mueve la presentación y lee las notas, casi siempre su celular.
_En inglés_: remote
_Evitar_: control remoto, mando, vista del presentador

**QR de control**:
Código de un solo uso que muestra la Pantalla. El primer celular que lo escanea se convierte en el Control de esa Sesión en vivo.
_En inglés_: remote QR code
_Evitar_: código de emparejamiento, QR de acceso, PIN

**Presentador**:
La persona que presenta una presentación en una Sesión en vivo.
_En inglés_: presenter
_Evitar_: orador, ponente, expositor

**Público**:
Las personas que miran la Pantalla.
_En inglés_: audience
_Evitar_: audiencia, espectadores
