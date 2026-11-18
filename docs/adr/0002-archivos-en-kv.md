# Los archivos de las presentaciones se guardan en Workers KV, no en R2

R2 es el servicio de Cloudflare pensado para archivos, pero puede pedir una tarjeta para crear el primer bucket, y el sitio debe funcionar sin pagar ni dejar tarjeta. KV viene en el plan gratis de Workers y acepta valores de hasta 25 MiB, lo que cubre el máximo de 20 MB por presentación. A cambio, el plan gratis de KV da 1 GB en total y 1.000 escrituras al día. Si eso se queda corto, se migra a R2.

## Consecuencias

- El límite de 50 MB por Dueño existe para repartir ese 1 GB. No hay límite de cantidad: solo importa el peso.
