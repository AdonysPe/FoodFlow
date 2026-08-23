import { randomInt, randomBytes, scryptSync, timingSafeEqual } from "crypto";

const OTP_LENGTH = 6;
const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function pepper(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET env var is not set");
  return secret;
}

export function generateOtp(): string {
  let code = "";
  for (let i = 0; i < OTP_LENGTH; i++) code += randomInt(0, 10).toString();
  return code;
}

export function otpExpiryDate(): Date {
  return new Date(Date.now() + OTP_TTL_MS);
}

export function maxOtpAttempts(): number {
  return MAX_ATTEMPTS;
}

// Format: <salt-hex>:<hash-hex>. scrypt (not bcrypt) so no native build step.
export function hashOtp(code: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(`${code}:${pepper()}`, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyOtpHash(code: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(`${code}:${pepper()}`, salt, 64);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
