import { TEXTS, isLang, pickLang } from "@sliding/core";
import { type Context, Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "./types";

// El idioma de la interfaz (#10): el que se eligió con el selector, guardado
// en una cookie; si no, el del navegador; si no es español ni inglés, inglés.

const COOKIE = "lang";
const YEAR = 60 * 60 * 24 * 365;

// En https la cookie lleva el prefijo __Host-, como la de la sesión (auth/cookies.ts).
const isHttps = (c: Context<AppEnv>) => new URL(c.req.url).protocol === "https:";

/** Deja en c.var.lang y c.var.t el idioma de quien mira y sus textos. */
export const language = createMiddleware<AppEnv>(async (c, next) => {
  const chosen = getCookie(c, COOKIE, isHttps(c) ? "host" : undefined);
  const lang = pickLang(chosen, c.req.header("accept-language"));
  c.set("lang", lang);
  c.set("t", TEXTS[lang]);
  await next();
  // La misma dirección cambia de idioma según el navegador y la cookie. Un
  // WebSocket (la Sesión en vivo) llega con sus cabeceras cerradas: no lleva idioma.
  if (c.res.status === 101 || c.res.webSocket) return;
  c.res.headers.set("content-language", lang);
  c.res.headers.append("vary", "Accept-Language, Cookie");
});

/** Una ruta de esta app a la que volver: nunca otro sitio. */
function backTo(c: Context<AppEnv>, raw: unknown): string {
  const candidates = [typeof raw === "string" ? raw : "", c.req.header("referer") ?? ""];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate, c.req.url);
      if (url.origin === new URL(c.req.url).origin && !url.pathname.startsWith("/idioma")) return url.pathname + url.search;
    } catch {
      // Una dirección rota no lleva a ninguna parte: se prueba la siguiente.
    }
  }
  return "/";
}

/** El selector: guarda el idioma elegido y vuelve a la misma página. */
export function languageRoutes() {
  const routes = new Hono<AppEnv>();
  routes.post("/", async (c) => {
    const body = await c.req.parseBody();
    const lang = body["idioma"];
    if (isLang(lang)) {
      const secure = isHttps(c);
      setCookie(c, COOKIE, lang, {
        path: "/",
        httpOnly: true,
        secure,
        sameSite: "Lax",
        maxAge: YEAR,
        ...(secure ? { prefix: "host" as const } : {}),
      });
    }
    return c.redirect(backTo(c, body["volver"]), 303);
  });
  return routes;
}
