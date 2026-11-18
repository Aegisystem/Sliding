import { serveDeck } from "../../src/serve-deck";

export const onRequestGet: PagesFunction<Cloudflare.Env, "id"> = ({ params, env }) =>
  serveDeck(String(params.id), env);
