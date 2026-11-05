import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { Role, MovementType } from "@prisma/client";

describe("Database & Seed Data Verification (Real PostgreSQL)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("contains seeded Admin and Staff accounts with valid password hashes", async () => {
    const admin = await prisma.user.findUnique({
      where: { email: "admin@stockpilot.io" },
    });
    expect(admin).not.toBeNull();
    expect(admin?.role).toBe(Role.ADMIN);
    expect(verifyPassword("Admin123!", admin!.passwordHash)).toBe(true);

    const staff = await prisma.user.findUnique({
      where: { email: "staff@stockpilot.io" },
    });
    expect(staff).not.toBeNull();
    expect(staff?.role).toBe(Role.STAFF);
    expect(verifyPassword("Staff123!", staff!.passwordHash)).toBe(true);
  });

  it("contains exactly 8 products with proper category relations", async () => {
    const products = await prisma.product.findMany({
      where: { sku: { not: { startsWith: "TEST-" } } },
      include: { category: true },
    });
    expect(products.length).toBe(8);

    const scanner = products.find((p) => p.sku === "PROD-SCAN-10");
    expect(scanner).toBeDefined();
    expect(scanner?.stockOnHand).toBe(10);
    expect(scanner?.priceMinor).toBe(14999);
    expect(scanner?.category.name).toBe("Scanning & Hardware");

    const lowStock = products.find((p) => p.sku === "PROD-LABEL-01");
    expect(lowStock).toBeDefined();
    expect(lowStock?.stockOnHand).toBe(2);
    expect(lowStock?.stockOnHand).toBeLessThan(lowStock!.lowStockThreshold);
  });

  it("enforces inventory accounting invariant: initial movement for every product", async () => {
    const products = await prisma.product.findMany({
      where: { sku: { not: { startsWith: "TEST-" } } },
    });
    for (const prod of products) {
      const movement = await prisma.inventoryMovement.findFirst({
        where: {
          productId: prod.id,
          type: MovementType.INITIAL,
        },
      });
      expect(movement).toBeDefined();
      expect(movement?.delta).toBeGreaterThan(0);
      expect(movement?.type).toBe(MovementType.INITIAL);
    }
  });

  it("contains seeded business customers", async () => {
    const customers = await prisma.customer.findMany();
    expect(customers.length).toBe(3);
    const names = customers.map((c) => c.name);
    expect(names).toContain("Apex Logistics Ltd");
  });
});

