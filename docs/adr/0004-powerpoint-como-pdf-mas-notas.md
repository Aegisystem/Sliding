# PowerPoint entra como PDF, y las notas se leen del .pptx en el navegador

Mostrar un `.pptx` tal como se ve en PowerPoint exige convertirlo con LibreOffice, que no corre en Workers, y Cloudflare Containers es de pago. Por eso Sliding acepta el PDF que exportan PowerPoint, Keynote y Google Slides, y lo muestra con pdf.js desde el origen de las presentaciones (ADR 0001). El PDF se ve igual que el original pero no trae las notas, así que el Dueño puede elegir también su `.pptx`: el navegador del Dueño abre el zip, lee las notas y el título de cada diapositiva, y manda solo ese texto. El `.pptx` nunca se sube: puede pesar cientos de MB por sus imágenes, y abrirlo en el Worker no cabe en los 10 ms de CPU del plan gratis. Las notas se emparejan con las páginas por número, sin contar las diapositivas ocultas, porque PowerPoint no las exporta al PDF.

## Opciones consideradas

- **Convertir el `.pptx` a HTML en el navegador** con una librería JS: es gratis, pero mueve fuentes y posiciones y rompe los gráficos. El Dueño culparía a Sliding. Descartada.
- **Que un Agente rehaga la presentación como html-slides**: no cuesta nada en Sliding, pero cambia el diseño del Dueño, y necesita la API de Agentes (#8). Queda como camino aparte.
- **Leer las notas del `.pptx` en el Worker**: obliga a subir el archivo entero solo para sacar unos KB de texto. Descartada.
- **Cargar pdf.js desde un CDN**: ahorra copiar archivos, pero la presentación dependería de un tercero en plena charla. Lo sirve el Worker de las presentaciones.
