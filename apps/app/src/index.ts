import { Hono } from "hono";

const app = new Hono<{ Bindings: Cloudflare.Env }>();

app.get("/", (c) =>
  c.html(`<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sliding</title></head>
<body><h1>Sliding</h1><p>Sube tu deck HTML y preséntalo con el celular.</p></body>
</html>`),
);

export default app;
