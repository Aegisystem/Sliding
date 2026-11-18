import type { Context } from "hono";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import type { AppEnv } from "../types";

// En https las cookies llevan el prefijo __Host-: solo este origen puede
// ponerlas y leerlas. En local (http://localhost) no todos los navegadores
// aceptan cookies Secure, así que ahí van sin prefijo.
function isHttps(c: Context<AppEnv>): boolean {
  return new URL(c.req.url).protocol === "https:";
}

export async function setSigned(c: Context<AppEnv>, name: string, value: string, maxAge: number): Promise<void> {
  const secure = isHttps(c);
  await setSignedCookie(c, name, value, c.env.SESSION_SECRET, {
    path: "/",
    httpOnly: true,
    secure,
    sameSite: "Lax",
    maxAge,
    ...(secure ? { prefix: "host" as const } : {}),
  });
}

/** El valor de la cookie, o null si falta o su firma no coincide. */
export async function getSigned(c: Context<AppEnv>, name: string): Promise<string | null> {
  const value = await getSignedCookie(c, c.env.SESSION_SECRET, name, isHttps(c) ? "host" : undefined);
  return value || null;
}

export function clear(c: Context<AppEnv>, name: string): void {
  const secure = isHttps(c);
  deleteCookie(c, name, { path: "/", secure, ...(secure ? { prefix: "host" as const } : {}) });
}
