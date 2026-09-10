import bcrypt from "bcrypt";
import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .max(72, "La contraseña no puede superar 72 caracteres.")
  .regex(/[A-Z]/, "La contraseña debe incluir una mayúscula.")
  .regex(/\d/, "La contraseña debe incluir un número.");

export function bcryptSaltRounds(): number {
  const configured = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);
  return Number.isInteger(configured) && configured >= 10 && configured <= 12
    ? configured
    : 10;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, bcryptSaltRounds());
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}
