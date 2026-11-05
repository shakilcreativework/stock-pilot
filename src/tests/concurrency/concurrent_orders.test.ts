import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { POST as createOrderRoute } from "@/app/api/orders/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";

describe("Concurrency Test: Simultaneous Orders for Remaining Stock", () => {
  let adminCookie: string;
  let staffCookie: string;
  let customerId: string;
  let testProductId: string;
  const createdOrderIds: string[] = [];

  beforeAll(async () => {
    const admin = await prisma.user.findUnique({ where: { email: "admin@stockpilot.io" } });
    const staff = await prisma.user.findUnique({ where: { email: "staff@stockpilot.io" } });
    const category = await prisma.category.findFirst();
    const customer = await prisma.customer.findFirst();

    if (!admin || !staff || !category || !customer) {
      throw new Error("Seed data missing.");
    }

    adminCookie = await createSession(admin.id);
    staffCookie = await createSession(staff.id);
    customerId = customer.id;

    // Create a product with exactly 5 units in stock
    const prod = await prisma.product.create({
      data: {
        sku: "TEST-CONCURRENT-BURST-05",
        name: "Concurrent Invariant Subject",
        categoryId: category.id,
        priceMinor: 5000,
        stockOnHand: 5,
        lowStockThreshold: 1,
      },
    });
    testProductId = prod.id;
  });

  afterAll(async () => {
    for (const orderId of createdOrderIds) {
      await prisma.inventoryMovement.deleteMany({ where: { orderId } });
      await prisma.orderItem.deleteMany({ where: { orderId } });
      await prisma.order.deleteMany({ where: { id: orderId } });
    }
    await prisma.inventoryMovement.deleteMany({ where: { productId: testProductId } });
    await prisma.product.deleteMany({ where: { id: testProductId } });
    await prisma.$disconnect();
  });

  it("handles simultaneous checkout bursts: exactly one 5-unit order succeeds and stock never drops below 0", async () => {
    const orderPayload = {
      customerId,
      items: [{ productId: testProductId, quantity: 5 }],
    };

    // Prepare two simultaneous requests (one by Admin, one by Staff)
    const reqAdmin = new NextRequest("http://localhost:3000/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `stockpilot_session=${adminCookie}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const reqStaff = new NextRequest("http://localhost:3000/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `stockpilot_session=${staffCookie}`,
      },
      body: JSON.stringify(orderPayload),
    });

    // Execute concurrently using Promise.all
    const [resAdmin, resStaff] = await Promise.all([
      createOrderRoute(reqAdmin),
      createOrderRoute(reqStaff),
    ]);

    const statuses = [resAdmin.status, resStaff.status].sort();

    // Invariant: Exactly ONE must succeed (201) and ONE must be rejected for insufficient stock (409)
    expect(statuses).toEqual([201, 409]);

    // Capture created order ID for cleanup
    if (resAdmin.status === 201) {
      const data = await resAdmin.json();
      createdOrderIds.push(data.data.id);
    }
    if (resStaff.status === 201) {
      const data = await resStaff.json();
      createdOrderIds.push(data.data.id);
    }

    // Critical Invariant: Final stock in PostgreSQL MUST be exactly 0, never negative!
    const finalProduct = await prisma.product.findUnique({
      where: { id: testProductId },
    });
    expect(finalProduct?.stockOnHand).toBe(0);
  });
});

