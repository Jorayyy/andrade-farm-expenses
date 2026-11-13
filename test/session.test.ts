import test from "node:test";
import assert from "node:assert/strict";
import { createSessionToken, verifySession } from "../src/lib/session.ts";

process.env.SESSION_SECRET = "test-secret-that-is-at-least-32-characters";

test("a fresh session token verifies", () => {
  assert.equal(verifySession(createSessionToken()), true);
});

test("tampered, malformed, and expired tokens fail", () => {
  const token = createSessionToken();
  assert.equal(verifySession(`${token}x`), false);
  assert.equal(verifySession("not-a-token"), false);
  assert.equal(verifySession(""), false);
  assert.equal(verifySession(null), false);

  const expired = createSessionToken(Date.now() - 31 * 24 * 60 * 60 * 1000);
  assert.equal(verifySession(expired), false);
});

test("a token signed with another secret fails", () => {
  const token = createSessionToken();
  process.env.SESSION_SECRET = "a-different-secret-that-is-32-chars";
  assert.equal(verifySession(token), false);
  process.env.SESSION_SECRET = "test-secret-that-is-at-least-32-characters";
});
