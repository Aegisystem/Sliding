import type { User } from "./auth/users";

export type AppEnv = {
  Bindings: Cloudflare.Env;
  Variables: { user: User | null };
};
