import { type Context, Hono } from "hono";
import type { AppEnv } from "../types";
import { clear, getSigned, setSigned } from "./cookies";
import { type Providers, isProvider } from "./providers";
import { endSession, startSession } from "./session";
import { upsertUser } from "./users";

// Lo que se recuerda entre la ida al proveedor y la vuelta: diez minutos.
const OAUTH_COOKIE = "oauth";
const OAUTH_MAX_AGE = 600;

export function authRoutes(getProviders: (c: Context<AppEnv>) => Providers) {
  const auth = new Hono<AppEnv>();

  auth.post("/logout", (c) => {
    endSession(c);
    return c.redirect("/", 303);
  });

  auth.get("/:provider", async (c) => {
    const provider = c.req.param("provider");
    if (!isProvider(provider)) return c.notFound();
    const { url, state, verifier } = getProviders(c)[provider].start();
    await setSigned(c, OAUTH_COOKIE, JSON.stringify({ provider, state, verifier }), OAUTH_MAX_AGE);
    return c.redirect(url.toString(), 302);
  });

  auth.get("/:provider/callback", async (c) => {
    const provider = c.req.param("provider");
    if (!isProvider(provider)) return c.notFound();
    const saved = parse(await getSigned(c, OAUTH_COOKIE));
    clear(c, OAUTH_COOKIE);

    const { code, state } = c.req.query();
    // El state tiene que ser el mismo que pusimos al salir: si no, la vuelta no la empezó esta persona.
    if (!saved || saved.provider !== provider || !code || !state || state !== saved.state) {
      return c.redirect("/?error=login", 302);
    }
    let profile;
    try {
      profile = await getProviders(c)[provider].finish(code, saved.verifier);
    } catch (error) {
      console.error(`Inicio de sesión con ${provider} falló`, error);
      return c.redirect("/?error=login", 302);
    }

    const user = await upsertUser(c.env.DB, provider, profile);
    if (user.disabled) return c.redirect("/?error=disabled", 302);
    await startSession(c, user.id);
    return c.redirect("/", 302);
  });

  return auth;
}

function parse(raw: string | null): { provider: string; state: string; verifier?: string } | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
