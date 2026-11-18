import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OAuthProvider, ProviderProfile } from "../src/auth/providers";
import { createApp } from "../src/index";

const ada: ProviderProfile = { id: "42", name: "Ada", email: "ada@example.com", avatarUrl: "https://avatars.test/ada.png" };

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
function browser({ origin = "https://app.test", profile = () => ada } = {}) {
  const app = createApp({ providers: () => ({ github: fakeProvider(profile), google: fakeProvider(profile) }) });
  const jar = new Map<string, string>();
  const setCookies: string[] = [];
  async function request(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    if (jar.size) headers.set("cookie", [...jar].map(([k, v]) => `${k}=${v}`).join("; "));
    const response = await app.request(`${origin}${path}`, { ...init, headers }, env);
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
  return { request, login, home, jar, setCookies };
}

const countUsers = async (providerId: string) =>
  (await env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE provider_id = ?").bind(providerId).first<{ n: number }>())!.n;

afterEach(() => vi.restoreAllMocks());

describe("iniciar sesión", () => {
  it("manda al proveedor y recuerda el state en una cookie firmada de diez minutos", async () => {
    const b = browser();
    const response = await b.request("/auth/github");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://proveedor.test/autorizar");
    const cookie = b.setCookies.find((line) => line.startsWith("__Host-oauth="))!;
    expect(cookie).toMatch(/Max-Age=600/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/Secure/);
  });

  it.each(["github", "google"])("con %s crea el Dueño y deja la sesión en una cookie __Host- firmada", async (provider) => {
    const profile = { ...ada, id: `nuevo-${provider}` };
    const b = browser({ profile: () => profile });
    const response = await b.login(provider);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/");
    const cookie = b.setCookies.find((line) => line.startsWith("__Host-session="))!;
    for (const attr of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/"]) expect(cookie).toContain(attr);
    expect(await countUsers(profile.id)).toBe(1);
    const html = await b.home();
    expect(html).toContain("Hola, Ada.");
    expect(html).toContain('action="/auth/logout"');
  });

  it("al volver a entrar actualiza los datos sin duplicar al Dueño", async () => {
    let name = "Ada";
    const b = browser({ profile: () => ({ ...ada, id: "repetida", name }) });
    await b.login();
    name = "Ada Lovelace";
    await b.login();
    expect(await countUsers("repetida")).toBe(1);
    expect(await b.home()).toContain("Hola, Ada Lovelace.");
  });

  it("rechaza la vuelta si el state no coincide", async () => {
    const b = browser({ profile: () => ({ ...ada, id: "intruso" }) });
    const response = await b.login("github", "otro-estado");
    expect(response.headers.get("location")).toBe("/?error=login");
    expect(b.jar.has("__Host-session")).toBe(false);
    expect(await countUsers("intruso")).toBe(0);
  });

  it("rechaza la vuelta si no empezó en este navegador", async () => {
    const response = await browser().request("/auth/github/callback?code=codigo&state=estado-123");
    expect(response.headers.get("location")).toBe("/?error=login");
  });

  it("avisa si el proveedor falla", async () => {
    const b = browser({
      profile: () => {
        throw new Error("GitHub caído");
      },
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await b.login();
    expect(response.headers.get("location")).toBe("/?error=login");
    expect(await (await b.request("/?error=login")).text()).toContain("No se pudo iniciar sesión");
  });

  it("no deja entrar a un Dueño desactivado y corta la sesión que tenía", async () => {
    const b = browser({ profile: () => ({ ...ada, id: "desactivada" }) });
    await b.login();
    await env.DB.prepare("UPDATE users SET disabled = 1 WHERE provider_id = 'desactivada'").run();
    expect(await b.home()).toContain("Entrar con GitHub");
    const response = await b.login();
    expect(response.headers.get("location")).toBe("/?error=disabled");
  });

  it("da 404 para un proveedor que no existe", async () => {
    expect((await browser().request("/auth/twitter")).status).toBe(404);
  });

  it("en local usa cookies sin prefijo ni Secure", async () => {
    const b = browser({ origin: "http://localhost:8787", profile: () => ({ ...ada, id: "local" }) });
    await b.login();
    const cookie = b.setCookies.find((line) => line.startsWith("session="))!;
    expect(cookie).not.toContain("Secure");
    expect(await b.home()).toContain("Hola, Ada.");
  });
});

describe("la sesión", () => {
  it("ignora una cookie alterada", async () => {
    const b = browser({ profile: () => ({ ...ada, id: "alterada" }) });
    await b.login();
    const [value, signature] = b.jar.get("__Host-session")!.split(".");
    b.jar.set("__Host-session", `${value}x.${signature}`);
    expect(await b.home()).toContain("Entrar con GitHub");
  });

  it("vence a los 30 días", async () => {
    const b = browser({ profile: () => ({ ...ada, id: "vencida" }) });
    await b.login();
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now + 31 * 24 * 60 * 60 * 1000);
    expect(await b.home()).toContain("Entrar con GitHub");
  });
});

describe("cerrar sesión", () => {
  it("borra la cookie de sesión", async () => {
    const b = browser({ profile: () => ({ ...ada, id: "salida" }) });
    await b.login();
    const response = await b.request("/auth/logout", { method: "POST", headers: { origin: "https://app.test" } });
    expect(response.status).toBe(303);
    expect(b.jar.has("__Host-session")).toBe(false);
    expect(await b.home()).toContain("Entrar con GitHub");
  });
});

describe("rutas que cambian datos", () => {
  it.each([
    ["con Origin de otro sitio", { origin: "https://decks.sliding.workers.dev" }, 403],
    ["sin Origin ni Sec-Fetch-Site", {}, 403],
    ["sin Origin pero desde el mismo origen", { "sec-fetch-site": "same-origin" }, 303],
    ["con el Origin de la app", { origin: "https://app.test" }, 303],
  ])("%s → %i", async (_, headers, status) => {
    const response = await browser().request("/auth/logout", { method: "POST", headers });
    expect(response.status).toBe(status);
  });
});
