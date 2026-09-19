import { beforeAll, describe, expect, test } from "vitest";
import { hashPassword, passwordSchema, verifyPassword } from "../lib/auth/password";
import {
  generateOtp,
  hashOtp,
  maxOtpAttempts,
  otpExpiryDate,
  verifyOtpHash,
} from "../lib/auth/otp";
import { createSessionToken, verifySessionToken } from "../lib/auth/session";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-auth-secret-with-at-least-32-characters";
  process.env.JWT_SECRET = "test-jwt-secret-with-at-least-32-characters";
  process.env.BCRYPT_SALT_ROUNDS = "10";
});

describe("password auth", () => {
  test("hashes and compares passwords with bcrypt", async () => {
    const hash = await hashPassword("FoodFlow9");
    expect(hash).toMatch(/^\$2[aby]\$10\$/);
    await expect(verifyPassword("FoodFlow9", hash)).resolves.toBe(true);
    await expect(verifyPassword("WrongPass9", hash)).resolves.toBe(false);
  });

  test("requires length, uppercase and number", () => {
    expect(passwordSchema.safeParse("FoodFlow9").success).toBe(true);
    expect(passwordSchema.safeParse("foodflow9").success).toBe(false);
    expect(passwordSchema.safeParse("FoodFlow").success).toBe(false);
    expect(passwordSchema.safeParse("Flow9").success).toBe(false);
  });

  test("reset OTP expires in 10 minutes and allows three attempts", () => {
    const before = Date.now();
    const code = generateOtp();
    const stored = hashOtp(code);
    const ttl = otpExpiryDate().getTime() - before;

    expect(code).toMatch(/^\d{6}$/);
    expect(verifyOtpHash(code, stored)).toBe(true);
    expect(verifyOtpHash("000000", stored)).toBe(code === "000000");
    expect(ttl).toBeGreaterThanOrEqual(10 * 60 * 1000 - 100);
    expect(ttl).toBeLessThanOrEqual(10 * 60 * 1000 + 100);
    expect(maxOtpAttempts()).toBe(3);
  });

  test("JWT carries the session version", async () => {
    const token = await createSessionToken({
      sub: "user-1",
      email: "owner@example.com",
      role: "restaurant_owner",
      sessionVersion: 7,
    });
    await expect(verifySessionToken(token)).resolves.toMatchObject({
      sub: "user-1",
      sessionVersion: 7,
    });
  });
});
