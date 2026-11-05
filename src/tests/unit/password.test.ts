import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("Password Hashing & Verification", () => {
  it("generates a salted hash and successfully verifies correct password", () => {
    const password = "AdminPassword123!";
    const hash = hashPassword(password);
    expect(hash).toContain(":");
    expect(verifyPassword(password, hash)).toBe(true);
  });

  it("rejects incorrect passwords", () => {
    const password = "AdminPassword123!";
    const hash = hashPassword(password);
    expect(verifyPassword("WrongPassword", hash)).toBe(false);
  });

  it("produces unique hashes for identical passwords due to salt generation", () => {
    const password = "TestPassword";
    const hash1 = hashPassword(password);
    const hash2 = hashPassword(password);
    expect(hash1).not.toBe(hash2);
    expect(verifyPassword(password, hash1)).toBe(true);
    expect(verifyPassword(password, hash2)).toBe(true);
  });
});

