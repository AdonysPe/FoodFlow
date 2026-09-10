"use server";

import { clearSessionCookie } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/current-user";
import { logAudit } from "@/lib/audit/log";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function logout(): Promise<void> {
  const user = await getCurrentUser();
  await clearSessionCookie();
  if (user) {
    await logAudit({ action: "auth.logout", actor: { id: user.id, email: user.email } });
  }
}
