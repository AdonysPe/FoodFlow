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
import { lookup as nodeLookupCallback } from "node:dns";
import { Agent } from "undici";

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
 * A `dns.lookup`-compatible function that refuses to resolve a hostname to a
 * private/internal address — passed to `guardedDispatcher` below so the
 * check below runs again at the moment of every real TCP connect, not only
 * once in `assertPublicHttpsUrl` before the request is issued. A hostname
 * whose authoritative DNS answers differently between those two moments
 * (DNS rebinding) is blocked at each one, which is what actually closes the
 * gap: the first check alone only proves the name was safe when checked, not
 * that it stays safe by the time `fetch` itself opens a socket.
 */
type GuardedLookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | { address: string; family: number }[],
  family?: number
) => void;

function guardedLookup(hostname: string, options: unknown, callback: unknown): void {
  const cb = (typeof options === "function" ? options : callback) as GuardedLookupCallback;
  const opts = (typeof options === "object" && options !== null ? options : {}) as {
    all?: boolean;
  };
  const wantsAll = opts.all === true;

  nodeLookupCallback(hostname, { all: true }, (err, resolved) => {
    if (err) return cb(err, wantsAll ? [] : "");
    const list = Array.isArray(resolved) ? resolved : [resolved];
    if (list.length === 0) {
      return cb(new Error(`No se pudo resolver ${hostname}.`), wantsAll ? [] : "");
    }
    const blocked = list.find((a) => isPrivateAddress(a.address, a.family));
    if (blocked) {
      return cb(
        new Error(`blocked_private_address: ${hostname} -> ${blocked.address}`),
        wantsAll ? [] : ""
      );
    }
    if (wantsAll) {
      cb(null, list);
    } else {
      cb(null, list[0].address, list[0].family);
    }
  });
}

/**
 * Fetch dispatcher every outbound call to an owner-typed billing URL must
 * use, in `probeEndpoint` below and in each OSE adapter's own request. Its
 * `connect.lookup` is `guardedLookup`, so the private-address check is not
 * just a pre-flight in `assertPublicHttpsUrl` — it runs again at the exact
 * moment the socket opens, which is what a TOCTOU / DNS-rebinding bypass
 * needs to slip past.
 */
export const guardedDispatcher = new Agent({ connect: { lookup: guardedLookup } });

export type UrlCheck =
  | { ok: true; url: URL }
  | { ok: false; message: string };

/**
 * The guard every outbound call to an owner-typed URL goes through.
 *
 * Https only (a token over http is a token leaked), a name that resolves, and
 * nothing resolving inside the network — "https://169.254.169.254/…" is a
 * perfectly valid URL and would have the server fetch its own cloud metadata.
 *
 * This is the fast, friendly pre-flight (good Spanish error messages before
 * any request is attempted). The actual close of the DNS-rebinding gap is
 * `guardedDispatcher` above, which every real request — here and in each OSE
 * adapter — must pass as its `dispatcher`, so the same check runs again right
 * at connect time.
 */
export async function assertPublicHttpsUrl(rawUrl: string): Promise<UrlCheck> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, message: "Esa URL no es válida." };
  }
  if (url.protocol !== "https:") {
    return { ok: false, message: "La URL de tu OSE debe usar https." };
  }

  try {
    const resolved = await lookup(url.hostname, { all: true });
    if (resolved.length === 0) {
      return { ok: false, message: "No pudimos resolver ese dominio." };
    }
    if (resolved.some((r) => isPrivateAddress(r.address, r.family))) {
      return {
        ok: false,
        message:
          "Esa URL apunta a una dirección interna. Usa la URL pública que te dio tu OSE.",
      };
    }
  } catch {
    return { ok: false, message: "Ese dominio no existe o no responde a DNS. Revisa la URL." };
  }

  return { ok: true, url };
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
  const checked = await assertPublicHttpsUrl(rawUrl);
  if (!checked.ok) return { ok: false, status: null, message: checked.message };
  const url = checked.url;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      signal: controller.signal,
      headers: { "user-agent": "FoodFlow/1.0 (+https://foodflow.site)" },
      // @ts-expect-error -- `dispatcher` is undici's fetch extension; Node's
      // global fetch (also undici-backed) accepts it though it isn't in the
      // standard lib.dom fetch types.
      dispatcher: guardedDispatcher,
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
