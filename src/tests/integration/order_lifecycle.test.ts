import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { POST as createOrderRoute } from "@/app/api/orders/route";
import { PATCH as updateOrderRoute } from "@/app/api/orders/[id]/route";
import { POST as cancelOrderRoute } from "@/app/api/orders/[id]/cancel/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";

describe("Transactional Order Lifecycle Integration", () => {
  let adminCookie: string;
  let customerId: string;
  let testProductId: string;
  let createdOrderId: string;

  const cleanTestArtifacts = async () => {
    await prisma.inventoryMovement.deleteMany({
      where: { product: { sku: "TEST-ORD-LIFECYCLE-10" } },
    });
    await prisma.orderItem.deleteMany({
      where: { product: { sku: "TEST-ORD-LIFECYCLE-10" } },
    });
    await prisma.order.deleteMany({
      where: { orderNumber: { startsWith: "ORD-" }, createdBy: { email: "admin@stockpilot.io" } },
    });
    await prisma.idempotencyRecord.deleteMany();
    await prisma.product.deleteMany({
      where: { sku: "TEST-ORD-LIFECYCLE-10" },
    });
  };

  beforeAll(async () => {
    await cleanTestArtifacts();

    const admin = await prisma.user.findUnique({ where: { email: "admin@stockpilot.io" } });
    const category = await prisma.category.findFirst();
    const customer = await prisma.customer.findFirst();

    if (!admin || !category || !customer) {
      throw new Error("Seed data missing.");
    }

    adminCookie = await createSession(admin.id);
    customerId = customer.id;

    // Dedicated product starting at 10 units
    const prod = await prisma.product.create({
      data: {
        sku: "TEST-ORD-LIFECYCLE-10",
        name: "Order Lifecycle Subject",
        categoryId: category.id,
        priceMinor: 10000, // $100.00
        stockOnHand: 10,
        lowStockThreshold: 2,
      },
    });
    testProductId = prod.id;
  });

  afterAll(async () => {
    await cleanTestArtifacts();
    await prisma.$disconnect();
  });

  it("FR-05: creates order for 3 units, deducting stock from 10 to 7 atomically", async () => {
    const req = new NextRequest("http://localhost:3000/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `stockpilot_session=${adminCookie}`,
      },
      body: JSON.stringify({
        customerId,
        items: [{ productId: testProductId, quantity: 3 }],
      }),
    });

    const res = await createOrderRoute(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.status).toBe("CONFIRMED");
    expect(json.data.totalMinor).toBe(30000); // 3 * $100
    createdOrderId = json.data.id;

    // Verify stockOnHand was reduced to 7 in database
    const prod = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(prod?.stockOnHand).toBe(7);

    // Verify inventory movement
    const movement = await prisma.inventoryMovement.findFirst({
      where: { orderId: createdOrderId },
    });
    expect(movement?.delta).toBe(-3);
    expect(movement?.quantityAfter).toBe(7);
  });

  it("FR-05: rejects order exceeding remaining stock (409 INSUFFICIENT_STOCK) without partial updates", async () => {
    const req = new NextRequest("http://localhost:3000/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `stockpilot_session=${adminCookie}`,
      },
      body: JSON.stringify({
        customerId,
        items: [{ productId: testProductId, quantity: 15 }], // 15 > 7 available
      }),
    });

    const res = await createOrderRoute(req);
    expect(res.status).toBe(409);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("INSUFFICIENT_STOCK");

    // Invariant: stock remains exactly 7
    const prod = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(prod?.stockOnHand).toBe(7);
  });

  it("FR-06: edits order from 3 to 5 units, consuming 2 additional units (stock 7 -> 5)", async () => {
    const orderBefore = await prisma.order.findUnique({ where: { id: createdOrderId } });

    const req = new NextRequest(`http://localhost:3000/api/orders/${createdOrderId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `stockpilot_session=${adminCookie}`,
      },
      body: JSON.stringify({
        version: orderBefore!.version,
        items: [{ productId: testProductId, quantity: 5 }],
      }),
    });

    const res = await updateOrderRoute(req, {
      params: Promise.resolve({ id: createdOrderId }),
    });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.totalMinor).toBe(50000); // 5 * $100
    expect(json.data.version).toBe(orderBefore!.version + 1);

    // Stock was 7, deducted 2 more -> leaves 5
    const prod = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(prod?.stockOnHand).toBe(5);
  });

  it("FR-06: edits order from 5 to 2 units, restoring 3 units (stock 5 -> 8)", async () => {
    const orderBefore = await prisma.order.findUnique({ where: { id: createdOrderId } });

    const req = new NextRequest(`http://localhost:3000/api/orders/${createdOrderId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `stockpilot_session=${adminCookie}`,
      },
      body: JSON.stringify({
        version: orderBefore!.version,
        items: [{ productId: testProductId, quantity: 2 }],
      }),
    });

    const res = await updateOrderRoute(req, {
      params: Promise.resolve({ id: createdOrderId }),
    });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.totalMinor).toBe(20000);

    // Stock was 5, restored 3 -> now 8
    const prod = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(prod?.stockOnHand).toBe(8);
  });

  it("FR-06: optimistic concurrency rejects stale version update (409 ORDER_CONFLICT)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/orders/${createdOrderId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `stockpilot_session=${adminCookie}`,
      },
      body: JSON.stringify({
        version: 999, // Stale version
        items: [{ productId: testProductId, quantity: 4 }],
      }),
    });

    const res = await updateOrderRoute(req, {
      params: Promise.resolve({ id: createdOrderId }),
    });
    expect(res.status).toBe(409);

    const json = await res.json();
    expect(json.error.code).toBe("ORDER_CONFLICT");

    // Stock remains untouched at 8
    const prod = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(prod?.stockOnHand).toBe(8);
  });

  it("FR-07: cancels order, restoring original remaining 2 units back to 10", async () => {
    const req = new NextRequest(`http://localhost:3000/api/orders/${createdOrderId}/cancel`, {
      method: "POST",
      headers: {
        Cookie: `stockpilot_session=${adminCookie}`,
      },
    });

    const res = await cancelOrderRoute(req, {
      params: Promise.resolve({ id: createdOrderId }),
    });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.status).toBe("CANCELLED");

    // Stock was 8 + 2 restored = 10
    const prod = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(prod?.stockOnHand).toBe(10);
  });

  it("FR-07: repeated cancel does not restore inventory twice (409 ALREADY_CANCELLED)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/orders/${createdOrderId}/cancel`, {
      method: "POST",
      headers: {
        Cookie: `stockpilot_session=${adminCookie}`,
      },
    });

    const res = await cancelOrderRoute(req, {
      params: Promise.resolve({ id: createdOrderId }),
    });
    expect(res.status).toBe(409);

    const json = await res.json();
    expect(json.error.code).toBe("ALREADY_CANCELLED");

    // Invariant: stock MUST remain 10!
    const prod = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(prod?.stockOnHand).toBe(10);
  });

  it("FR-10: enforces idempotency by returning cached order without duplicate stock deduction", async () => {
    const idempotencyKey = `idem-key-${Date.now()}`;
    const payload = {
      customerId,
      idempotencyKey,
      items: [{ productId: testProductId, quantity: 2 }],
    };

    const makeReq = () =>
      new NextRequest("http://localhost:3000/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `stockpilot_session=${adminCookie}`,
        },
        body: JSON.stringify(payload),
      });

    // First submission
    const res1 = await createOrderRoute(makeReq());
    expect(res1.status).toBe(201);
    const json1 = await res1.json();
    const order1Id = json1.data.id;

    // Stock was 10, deducted 2 -> leaves 8
    const prodAfterFirst = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(prodAfterFirst?.stockOnHand).toBe(8);

    // Second submission with exact same idempotency key and payload
    const res2 = await createOrderRoute(makeReq());
    expect(res2.status).toBe(200); // Cached return
    const json2 = await res2.json();
    expect(json2.data.id).toBe(order1Id);

    // Invariant: stock MUST STILL BE 8!
    const prodAfterSecond = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(prodAfterSecond?.stockOnHand).toBe(8);

    // Cleanup idempotency test order
    await prisma.inventoryMovement.deleteMany({ where: { orderId: order1Id } });
    await prisma.orderItem.deleteMany({ where: { orderId: order1Id } });
    await prisma.order.deleteMany({ where: { id: order1Id } });
  });
});
