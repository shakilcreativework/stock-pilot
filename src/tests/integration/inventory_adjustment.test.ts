import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { POST as adjustStockRoute } from "@/app/api/inventory/adjustments/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";

describe("Inventory Stock Adjustment & Concurrency Invariants", () => {
  let adminCookie: string;
  let staffCookie: string;
  let testProductId: string;

  beforeAll(async () => {
    const admin = await prisma.user.findUnique({ where: { email: "admin@stockpilot.io" } });
    const staff = await prisma.user.findUnique({ where: { email: "staff@stockpilot.io" } });
    const category = await prisma.category.findFirst();

    if (!admin || !staff || !category) {
      throw new Error("Seed data missing.");
    }

    adminCookie = await createSession(admin.id);
    staffCookie = await createSession(staff.id);

    // Create a dedicated product for inventory adjustment tests with stock 10
    const prod = await prisma.product.create({
      data: {
        sku: "TEST-ADJUST-10",
        name: "Inventory Adjustment Subject",
        categoryId: category.id,
        priceMinor: 2500,
        stockOnHand: 10,
        lowStockThreshold: 3,
      },
    });
    testProductId = prod.id;
  });

  afterAll(async () => {
    await prisma.inventoryMovement.deleteMany({
      where: { productId: testProductId },
    });
    await prisma.product.deleteMany({
      where: { id: testProductId },
    });
    await prisma.$disconnect();
  });

  it("allows Admin to perform positive stock adjustment", async () => {
    const req = new NextRequest("http://localhost:3000/api/inventory/adjustments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `stockpilot_session=${adminCookie}`,
      },
      body: JSON.stringify({
        productId: testProductId,
        delta: 5,
        reason: "Received new supplier shipment",
      }),
    });

    const res = await adjustStockRoute(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.product.stockOnHand).toBe(15);
    expect(json.data.movement.delta).toBe(5);
    expect(json.data.movement.quantityAfter).toBe(15);

    // Verify DB state
    const dbProd = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(dbProd?.stockOnHand).toBe(15);
  });

  it("allows Admin to perform negative stock adjustment within available balance", async () => {
    const req = new NextRequest("http://localhost:3000/api/inventory/adjustments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `stockpilot_session=${adminCookie}`,
      },
      body: JSON.stringify({
        productId: testProductId,
        delta: -3,
        reason: "Damaged packaging discard",
      }),
    });

    const res = await adjustStockRoute(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.product.stockOnHand).toBe(12); // 15 - 3
    expect(json.data.movement.delta).toBe(-3);
    expect(json.data.movement.quantityAfter).toBe(12);
  });

  it("strictly rejects stock deduction exceeding available stock (409 INSUFFICIENT_STOCK)", async () => {
    // Current stock is 12, trying to deduct 20
    const req = new NextRequest("http://localhost:3000/api/inventory/adjustments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `stockpilot_session=${adminCookie}`,
      },
      body: JSON.stringify({
        productId: testProductId,
        delta: -20,
        reason: "Oversized reduction attempt",
      }),
    });

    const res = await adjustStockRoute(req);
    expect(res.status).toBe(409);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("INSUFFICIENT_STOCK");

    // Invariant verification: stock must remain unchanged at 12!
    const dbProd = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(dbProd?.stockOnHand).toBe(12);
  });

  it("strictly forbids Staff from performing stock adjustments (HTTP 403)", async () => {
    const req = new NextRequest("http://localhost:3000/api/inventory/adjustments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `stockpilot_session=${staffCookie}`,
      },
      body: JSON.stringify({
        productId: testProductId,
        delta: 2,
        reason: "Staff unauthorized attempt",
      }),
    });

    const res = await adjustStockRoute(req);
    expect(res.status).toBe(403);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("FORBIDDEN");
  });
});

