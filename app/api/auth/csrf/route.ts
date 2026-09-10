import { NextResponse } from "next/server";
import { createCsrfToken, CSRF_COOKIE } from "@/lib/auth/csrf";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = createCsrfToken();
  const response = NextResponse.json({ token }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60,
  });
  return response;
}
