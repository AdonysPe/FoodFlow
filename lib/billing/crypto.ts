// Server only. Nothing here is importable from a client component: it reaches
// for node:crypto, which the browser bundle cannot resolve.
import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

/**
 * Envelope for the two things this module protects: the venue's OSE token and
 * the password to its digital certificate (and the certificate itself).
 *
 * AES-256-GCM, random 12-byte IV per value, tag kept alongside. Stored as
 * `v1.<iv>.<tag>.<ciphertext>` in base64url so it survives a text column.
 *
 * KEY MATERIAL. `BILLING_ENCRYPTION_KEY` (32 bytes, base64 or hex) is the one
 * that should be set in production, because it can be rotated on its own. When
 * it is absent the key is derived from `AUTH_SECRET` via HKDF with a fixed
 * info string, so a fresh checkout works without a second secret — at the cost
 * that rotating AUTH_SECRET makes every stored certificate unreadable. That
 * trade is written down in SEGURIDAD.md; set the dedicated key before a real
 * restaurant uploads a certificate.
 */

const VERSION = "v1";
const IV_BYTES = 12;

let cachedKey: Buffer | null = null;

function keyMaterial(): Buffer {
  if (cachedKey) return cachedKey;

  const explicit = process.env.BILLING_ENCRYPTION_KEY?.trim();
  if (explicit) {
    const buf = decodeKey(explicit);
    if (buf.length !== 32) {
      throw new Error(
        "BILLING_ENCRYPTION_KEY debe tener 32 bytes (base64 o hex). Genera uno con: openssl rand -base64 32"
      );
    }
    cachedKey = buf;
    return buf;
  }

  const auth = process.env.AUTH_SECRET?.trim();
  if (!auth) {
    throw new Error(
      "Falta BILLING_ENCRYPTION_KEY (o AUTH_SECRET) para cifrar las credenciales de facturación."
    );
  }
  cachedKey = Buffer.from(
    hkdfSync("sha256", Buffer.from(auth, "utf8"), Buffer.alloc(0), "foodflow:billing:v1", 32)
  );
  return cachedKey;
}

function decodeKey(raw: string): Buffer {
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  return Buffer.from(raw, "base64");
}

/** True when this deployment can store secrets at all. Checked before the form saves. */
export function billingCryptoReady(): boolean {
  try {
    keyMaterial();
    return true;
  } catch {
    return false;
  }
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", keyMaterial(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, b64(iv), b64(tag), b64(ct)].join(".");
}

export function decryptSecret(payload: string): string {
  const [version, iv, tag, ct] = payload.split(".");
  if (version !== VERSION || !iv || !tag || !ct) {
    throw new Error("El valor cifrado no tiene el formato esperado.");
  }
  const decipher = createDecipheriv("aes-256-gcm", keyMaterial(), unb64(iv));
  decipher.setAuthTag(unb64(tag));
  return Buffer.concat([decipher.update(unb64(ct)), decipher.final()]).toString("utf8");
}

/** Returns null instead of throwing when the key rotated under stored data. */
export function tryDecryptSecret(payload: string | null): string | null {
  if (!payload) return null;
  try {
    return decryptSecret(payload);
  } catch {
    return null;
  }
}

/**
 * What the form is allowed to show back: enough for the owner to recognise the
 * credential, never enough to use it. Short values are hidden entirely.
 */
export function maskSecret(plain: string | null): string | null {
  if (!plain) return null;
  if (plain.length <= 8) return "••••••••";
  return `${"•".repeat(8)}${plain.slice(-4)}`;
}

/**
 * Plain aliases. The encryption service is this file; these two names exist so
 * the emission pipeline and the API layer can read `encrypt`/`decrypt` without
 * anyone being tempted to write a second implementation next to it.
 */
export { encryptSecret as encrypt, decryptSecret as decrypt };

/** Constant-time compare, for the rare case we check a value against a stored one. */
export function secretsMatch(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function b64(buf: Buffer): string {
  return buf.toString("base64url");
}

function unb64(value: string): Buffer {
  return Buffer.from(value, "base64url");
}
