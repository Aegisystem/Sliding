import { createMiddleware } from "hono/factory";
import type { AppEnv } from "./types";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Las rutas que cambian datos solo aceptan peticiones hechas desde la propia
 * app. Así un deck (u otro sitio) no puede usar la sesión de quien lo mira.
 */
export const sameOrigin = createMiddleware<AppEnv>(async (c, next) => {
  if (SAFE_METHODS.has(c.req.method)) return next();
  // La API para Agentes (#8) no mira la sesión: solo acepta la Clave para
  // Agentes en Authorization, que otro sitio no puede mandar.
  if (c.req.path.startsWith("/api/")) return next();
  const origin = c.req.header("origin");
  const allowed = origin
    ? origin === new URL(c.req.url).origin
    : c.req.header("sec-fetch-site") === "same-origin";
  if (!allowed) return c.text("Origen no permitido", 403);
  return next();
});
