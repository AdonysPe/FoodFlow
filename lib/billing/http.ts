// Outbound HTTP for the billing module.
//
// The URL being called here was typed by a restaurant owner into a form, which
// makes every request a potential SSRF: "https://169.254.169.254/…" is a valid
// URL and would have the server fetch its own cloud metadata. So the host is
// resolved first and anything pointing inside the network is refused before a
// socket is opened.
//
// Server only.

import { lookup } from "node:dns/promises";

export type ProbeResult = {
  ok: boolean;
  /** HTTP status when the host answered at all. */
  status: number | null;
  message: string;
};

const TIMEOUT_MS = 8000;

/** RFC1918, loopback, link-local, CGNAT, and the IPv6 equivalents. */
function isPrivateAddress(address: string, family: number): boolean {
  if (family === 6) {
    const v6 = address.toLowerCase();
    if (v6 === "::1" || v6 === "::") return true;
    if (v6.startsWith("fe80") || v6.startsWith("fc") || v6.startsWith("fd")) return true;
    // IPv4-mapped (::ffff:10.0.0.1) hides a private v4 behind a v6 literal.
    const mapped = v6.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1], 4);
    return false;
  }

  const [a, b] = address.split(".").map(Number);
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

/**
 * Reaches the OSE endpoint just far enough to say whether it is there.
 *
 * Deliberately does NOT send the credentials: every provider authenticates
 * differently, and a token posted to the wrong shape of endpoint can end up in
 * somebody's access log. What this proves is the URL, which is the field
 * owners get wrong.
 */
export async function probeEndpoint(rawUrl: string): Promise<ProbeResult> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, status: null, message: "Esa URL no es válida." };
  }
  if (url.protocol !== "https:") {
    return { ok: false, status: null, message: "La URL de tu OSE debe usar https." };
  }

  try {
    const resolved = await lookup(url.hostname, { all: true });
    if (resolved.length === 0) {
      return { ok: false, status: null, message: "No pudimos resolver ese dominio." };
    }
    if (resolved.some((r) => isPrivateAddress(r.address, r.family))) {
      return {
        ok: false,
        status: null,
        message: "Esa URL apunta a una dirección interna. Usa la URL pública que te dio tu OSE.",
      };
    }
  } catch {
    return {
      ok: false,
      status: null,
      message: "Ese dominio no existe o no responde a DNS. Revisa la URL.",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      signal: controller.signal,
      headers: { "user-agent": "FoodFlow/1.0 (+https://foodflow.site)" },
    });
    // Any answer at all — including 401, 404 or 405 — proves the host is up and
    // speaking HTTPS, which is all this check claims.
    return {
      ok: true,
      status: res.status,
      message: `El servidor de tu OSE respondió (HTTP ${res.status}).`,
    };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      status: null,
      message: aborted
        ? "El servidor de tu OSE no respondió en 8 segundos."
        : "No pudimos conectarnos a esa URL.",
    };
  } finally {
    clearTimeout(timer);
  }
}
