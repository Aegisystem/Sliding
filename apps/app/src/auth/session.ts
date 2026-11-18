import type { Context } from "hono";
import type { AppEnv } from "../types";
import { clear, getSigned, setSigned } from "./cookies";

const COOKIE = "session";
const MAX_AGE = 60 * 60 * 24 * 30;

export async function startSession(c: Context<AppEnv>, userId: string): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  await setSigned(c, COOKIE, JSON.stringify({ uid: userId, exp }), MAX_AGE);
}

/** Id del usuario con sesión, o null. La fecha va firmada dentro: una cookie vieja no revive. */
export async function readSession(c: Context<AppEnv>): Promise<string | null> {
  const raw = await getSigned(c, COOKIE);
  if (!raw) return null;
  try {
    const { uid, exp } = JSON.parse(raw) as { uid?: unknown; exp?: unknown };
    return typeof uid === "string" && typeof exp === "number" && exp > Date.now() / 1000 ? uid : null;
  } catch {
    return null;
  }
}

export function endSession(c: Context<AppEnv>): void {
  clear(c, COOKIE);
}
