// Constant-time comparison of a request's bearer token against a secret.
//
// Both sides are hashed first so the comparison always runs over two 32-byte
// digests: a plain length check before `timingSafeEqual` would tell a caller
// how long the secret is.

import { createHash, timingSafeEqual } from "node:crypto";

const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();

export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b));
}

/** True when the request carries `Authorization: Bearer <secret>`. False if no secret is configured. */
export function hasBearer(request: Request, secret: string | undefined): boolean {
  const expected = secret?.trim();
  if (!expected) return false;
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;
  return safeEqual(header.slice(7), expected);
}
