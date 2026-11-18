import { GitHub, Google, decodeIdToken, generateCodeVerifier, generateState } from "arctic";

export type Provider = "github" | "google";
export const isProvider = (value: string): value is Provider => value === "github" || value === "google";

/** Lo que guardamos de la cuenta del proveedor (ver /privacidad). */
export interface ProviderProfile {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
}

export interface OAuthProvider {
  /** Adónde mandar a la persona, y lo que hay que recordar hasta que vuelva. */
  start(): { url: URL; state: string; verifier?: string };
  /** Cambia el código de la vuelta por los datos de la cuenta. */
  finish(code: string, verifier?: string): Promise<ProviderProfile>;
}

export type Providers = Record<Provider, OAuthProvider>;

export function realProviders(env: Cloudflare.Env, origin: string): Providers {
  const github = new GitHub(env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET, `${origin}/auth/github/callback`);
  const google = new Google(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, `${origin}/auth/google/callback`);

  return {
    github: {
      start() {
        const state = generateState();
        return { url: github.createAuthorizationURL(state, ["read:user", "user:email"]), state };
      },
      async finish(code) {
        const token = (await github.validateAuthorizationCode(code)).accessToken();
        const headers = {
          authorization: `Bearer ${token}`,
          accept: "application/vnd.github+json",
          "user-agent": "Sliding",
        };
        const user = await getJson<{ id: number; login: string; name: string | null; email: string | null; avatar_url: string }>(
          "https://api.github.com/user",
          headers,
        );
        // Si el correo es privado no viene en /user: se toma el principal ya verificado.
        let email = user.email;
        if (!email) {
          const emails = await getJson<{ email: string; primary: boolean; verified: boolean }[]>(
            "https://api.github.com/user/emails",
            headers,
          );
          email = emails.find((e) => e.primary && e.verified)?.email ?? null;
        }
        return { id: String(user.id), name: user.name || user.login, email, avatarUrl: user.avatar_url };
      },
    },
    google: {
      start() {
        const state = generateState();
        const verifier = generateCodeVerifier();
        return { url: google.createAuthorizationURL(state, verifier, ["openid", "email", "profile"]), state, verifier };
      },
      async finish(code, verifier) {
        if (!verifier) throw new Error("Falta el code verifier de Google");
        // El id token llega directo de Google por TLS: no hace falta verificar su firma.
        const claims = decodeIdToken((await google.validateAuthorizationCode(code, verifier)).idToken()) as {
          sub: string;
          name?: string;
          email?: string;
          email_verified?: boolean;
          picture?: string;
        };
        return {
          id: claims.sub,
          name: claims.name || claims.email || "Sin nombre",
          email: claims.email_verified ? (claims.email ?? null) : null,
          avatarUrl: claims.picture ?? null,
        };
      },
    },
  };
}

async function getJson<T>(url: string, headers: Record<string, string>): Promise<T> {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${url} respondió ${response.status}`);
  return response.json<T>();
}
