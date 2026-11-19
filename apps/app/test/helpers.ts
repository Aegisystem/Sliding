import { env } from "cloudflare:workers";
import type { OAuthProvider, ProviderProfile } from "../src/auth/providers";
import type { Limits } from "../src/decks/limits";
import { createApp } from "../src/index";

export const ada: ProviderProfile = { id: "42", name: "Ada", email: "ada@example.com", avatarUrl: "https://avatars.test/ada.png" };

function fakeProvider(result: () => ProviderProfile): OAuthProvider {
  return {
    start: () => ({ url: new URL("https://proveedor.test/autorizar"), state: "estado-123", verifier: "verificador" }),
    finish: async (code, verifier) => {
      if (code !== "codigo" || verifier !== "verificador") throw new Error("código inesperado");
      return result();
    },
  };
}

/** Un navegador mínimo: guarda las cookies que pone la app y las manda de vuelta. */
export function browser({
  origin = "https://app.test",
  profile = () => ada,
  limits,
  vars,
  lang = "es",
}: {
  origin?: string;
  /** El Accept-Language del navegador. */
  lang?: string;
  profile?: () => ProviderProfile;
  limits?: Limits;
  /** Variables de entorno de más, por ejemplo ADMIN_USER_IDS. Se leen en cada pedido, así que pueden cambiar después. */
  vars?: Record<string, string>;
} = {}) {
  const app = createApp({
    providers: () => ({ github: fakeProvider(profile), google: fakeProvider(profile) }),
    ...(limits ? { limits } : {}),
  });
  const jar = new Map<string, string>();
  const setCookies: string[] = [];
  async function request(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    // Los tests leen la interfaz en español salvo que pidan otro idioma (#10).
    if (!headers.has("accept-language")) headers.set("accept-language", lang);
    if (jar.size) headers.set("cookie", [...jar].map(([k, v]) => `${k}=${v}`).join("; "));
    const response = await app.request(`${origin}${path}`, { ...init, headers }, vars ? { ...env, ...vars } : env);
    for (const line of response.headers.getSetCookie()) {
      setCookies.push(line);
      const pair = line.split(";")[0]!;
      const name = pair.slice(0, pair.indexOf("="));
      if (/max-age=0/i.test(line)) jar.delete(name);
      else jar.set(name, pair.slice(pair.indexOf("=") + 1));
    }
    return response;
  }
  const login = async (provider = "github", state = "estado-123") => {
    await request(`/auth/${provider}`);
    return request(`/auth/${provider}/callback?code=codigo&state=${state}`);
  };
  const home = async () => (await request("/")).text();
  return { request, login, home, jar, setCookies, origin };
}
