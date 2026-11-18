# El Control siempre se conecta a través de la nube

El Control y la Pantalla se comunican por WebSocket a través de un Durable Object de Cloudflare, nunca de forma directa (WebRTC o red local). El wifi de los eventos suele bloquear las conexiones directas, y el Orador a veces usa datos móviles. La seguridad la da el QR de control de un solo uso.

## Opciones consideradas

- **Revisar que el Control y la Pantalla estén en la misma red**: es fácil comparar la IP pública, pero el Público suele estar en el mismo wifi, así que no lo detiene. Además bloquearía al Orador con datos móviles, y con IPv6 falla aunque estén en la misma red. Descartada.
