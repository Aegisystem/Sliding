# Sliding

Sube una presentación HTML o PDF y queda publicada, sin desplegar nada. Para presentarla, escanea con el celular el QR que muestra la Pantalla: el celular se convierte en el Control, con tus notas, el cronómetro y la vista previa de la diapositiva siguiente.

Funciona mejor con presentaciones hechas con la skill html-slides. Si tu presentación es de PowerPoint, Keynote o Google Slides, súbela como PDF; si eliges también el .pptx, tu navegador lee sus notas sin subirlo. Cualquier otro HTML se aloja igual y se controla con anterior y siguiente.

## Desarrollo local

```bash
npm install
npm run seed
npm run dev
```

La app queda en http://localhost:8787 y las presentaciones en http://127.0.0.1:8788, dos orígenes distintos como en producción. `npm run seed` carga dos presentaciones de prueba e imprime sus enlaces.

Para iniciar sesión en local hacen falta credenciales de OAuth en `apps/app/.dev.vars` (mira `.dev.vars.example`). [`scripts/setup.sh`](scripts/setup.sh) es un asistente que te guía para crearlas, junto con la cuenta de Cloudflare y los secretos de despliegue.

## Más

- Vocabulario: [CONTEXT.md](CONTEXT.md)
- Decisiones: [docs/adr/](docs/adr/)
- Tareas: [issues](https://github.com/Aegisystem/Sliding/issues)
