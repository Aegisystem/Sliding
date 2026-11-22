import { Hono } from "hono";
import { agentKeysPage } from "../pages";
import type { AppEnv } from "../types";
import { createKey, isKeyId, listKeys, revokeKey } from "./keys";

/** Las Claves para Agentes del Dueño (#7). Va dentro del panel, que ya exige sesión. */
export function agentRoutes() {
  const agents = new Hono<AppEnv>();

  agents.get("/", async (c) => {
    const user = c.var.user!;
    return c.html(
      agentKeysPage({
        t: c.var.t,
        user,
        keys: await listKeys(c.env.DB, user.id),
        ok: c.req.query("ok"),
        error: c.req.query("error"),
      }),
    );
  });

  // La respuesta es la página con la clave nueva, sin redirigir: así la clave
  // no se guarda en ninguna parte, ni siquiera un momento.
  agents.post("/", async (c) => {
    const user = c.var.user!;
    const created = await createKey(c.env.DB, user.id, (await c.req.parseBody())["nombre"]);
    if (!created.ok) return c.redirect(`/panel/agentes?error=${created.error}`, 303);
    c.header("cache-control", "no-store");
    return c.html(
      agentKeysPage({ t: c.var.t, user, keys: await listKeys(c.env.DB, user.id), created: { key: created.key, name: created.name } }),
    );
  });

  agents.post("/:id/revocar", async (c) => {
    const id = c.req.param("id");
    const revoked = isKeyId(id) && (await revokeKey(c.env.DB, c.var.user!.id, id));
    return c.redirect(revoked ? "/panel/agentes?ok=revocada" : "/panel/agentes?error=no-existe", 303);
  });

  return agents;
}
