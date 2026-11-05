import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Hashes a plaintext password using crypto.scrypt with a unique random 16-byte salt.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verifies a plaintext password against a stored "salt:hash" string using timing-safe comparison.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) {
    return false;
  }
  const derivedKey = scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key, "hex");
  if (derivedKey.length !== keyBuffer.length) {
    return false;
  }
  return timingSafeEqual(derivedKey, keyBuffer);
}

