import { randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const CSRF_COOKIE = "foodflow_csrf";
export const CSRF_HEADER = "x-csrf-token";

export function createCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

export function verifyCsrf(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    if (new URL(origin).origin !== request.nextUrl.origin) return false;
  } catch {
    return false;
  }

  const cookie = request.cookies.get(CSRF_COOKIE)?.value;
  const header = request.headers.get(CSRF_HEADER);
  if (!cookie || !header) return false;

  const cookieBytes = Buffer.from(cookie);
  const headerBytes = Buffer.from(header);
  return (
    cookieBytes.length === headerBytes.length &&
    timingSafeEqual(cookieBytes, headerBytes)
  );
}
