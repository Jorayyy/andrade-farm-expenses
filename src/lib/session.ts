import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function secret() {
  return process.env.SESSION_SECRET ?? "";
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(now = Date.now()): string {
  if (secret().length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  const payload = Buffer.from(JSON.stringify({ exp: now + SESSION_MAX_AGE_SECONDS * 1000 })).toString(
    "base64url",
  );
  return `${payload}.${sign(payload)}`;
}

export function verifySession(token: string | null | undefined, now = Date.now()): boolean {
  if (!token || secret().length < 32) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, signature] = parts;

  const expected = Buffer.from(sign(payload), "base64url");
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;

  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { exp?: unknown };
    return typeof exp === "number" && exp > now;
  } catch {
    return false;
  }
}
