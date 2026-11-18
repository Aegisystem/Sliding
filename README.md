# Sliding

Sube un deck HTML y queda publicado, sin desplegar nada. Para presentarlo, escanea con el celular el QR que muestra la Pantalla: el celular se convierte en el Control, con tus notas, el cronómetro y la vista previa de la slide siguiente.

Funciona mejor con decks hechos con la skill html-slides. Cualquier otro HTML se aloja igual y se controla con anterior y siguiente.

## Desarrollo local

```bash
npm install
npm run seed
npm run dev
```

La app queda en http://localhost:8787 y los decks en http://127.0.0.1:8788, dos orígenes distintos como en producción. `npm run seed` carga dos decks de prueba e imprime sus enlaces.

Para iniciar sesión en local hacen falta credenciales de OAuth en `apps/app/.dev.vars` (mira `.dev.vars.example`). [`scripts/setup.sh`](scripts/setup.sh) es un asistente que te guía para crearlas, junto con la cuenta de Cloudflare y los secretos de despliegue.

## Más

- Vocabulario: [CONTEXT.md](CONTEXT.md)
- Decisiones: [docs/adr/](docs/adr/)
- Tareas: [issues](https://github.com/Aegisystem/Sliding/issues)
