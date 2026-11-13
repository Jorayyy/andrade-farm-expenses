import { createHash, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionToken, SESSION_MAX_AGE_SECONDS, verifySession } from "@/lib/session";

export const SESSION_COOKIE = "andrade_farm_session";

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 10 * 60 * 1000;
// shortcut: per-instance memory; move to a shared store if login abuse becomes real.
const attempts = new Map<string, { count: number; resetAt: number }>();

export async function clientKey() {
  const forwarded = (await headers()).get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "local";
}

export function passwordMatches(input: string) {
  const expected = process.env.AUTH_PASSWORD ?? "";
  if (!expected) return false;
  const actual = createHash("sha256").update(input).digest();
  const wanted = createHash("sha256").update(expected).digest();
  return timingSafeEqual(actual, wanted);
}

export async function isAuthenticated() {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function requireAuth() {
  if (!(await isAuthenticated())) redirect("/login");
}

export async function startSession() {
  (await cookies()).set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function loginBlocked() {
  const entry = attempts.get(await clientKey());
  return Boolean(entry && entry.resetAt > Date.now() && entry.count >= MAX_ATTEMPTS);
}

export async function noteFailedLogin() {
  const key = await clientKey();
  const now = Date.now();
  if (attempts.size > 1000) attempts.clear();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

export function clearFailedLogins() {
  attempts.clear();
}
