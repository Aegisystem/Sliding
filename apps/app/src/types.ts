import type { Lang, Texts } from "@sliding/core";
import type { User } from "./auth/users";

export type AppEnv = {
  Bindings: Cloudflare.Env;
  Variables: {
    user: User | null;
    /** El idioma de quien mira y sus textos (#10). Los pone lang.ts. */
    lang: Lang;
    t: Texts;
  };
};
