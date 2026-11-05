import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { POST as orderCreateHandler } from "@/app/api/orders/route";
import { PATCH as orderUpdateHandler } from "@/app/api/orders/[id]/route";
import { POST as orderCancelHandler } from "@/app/api/orders/[id]/cancel/route";
import { POST as stockAdjustHandler } from "@/app/api/inventory/adjustments/route";
import { GET as auditListHandler } from "@/app/api/audit-logs/route";
import { NextRequest } from "next/server";

describe("ARAVEX Assessment 3-Minute Live Demo Flow E2E Integration", () => {
  let adminCookie = "";
  let staffCookie = "";
  let targetProduct: any;
  let customer: any;

  beforeAll(async () => {
    // 1. Authenticate Admin and Staff sessions
    const admin = await prisma.user.findUnique({ where: { email: "admin@stockpilot.io" } });
    const staff = await prisma.user.findUnique({ where: { email: "staff@stockpilot.io" } });

    if (!admin || !staff) {
      throw new Error("Seed users missing");
    }

    const adminToken = await createSession(admin.id);
    const staffToken = await createSession(staff.id);

    adminCookie = `stockpilot_session=${adminToken}`;
    staffCookie = `stockpilot_session=${staffToken}`;

    // 2. Find demo product PROD-SCAN-10
    targetProduct = await prisma.product.findUnique({
      where: { sku: "PROD-SCAN-10" },
    });
    expect(targetProduct).toBeDefined();

    // Ensure initial stock is reset to exactly 10 for deterministic testing
    if (targetProduct.stockOnHand !== 10) {
      await prisma.product.update({
        where: { id: targetProduct.id },
        data: { stockOnHand: 10 },
      });
      targetProduct.stockOnHand = 10;
    }

    // 4. Find customer
    customer = await prisma.customer.findFirst();
    expect(customer).toBeDefined();
  });

  it("Step 1 (0:30-1:15): Demo product exists with initial stock of exactly 10 units", async () => {
    const prod = await prisma.product.findUnique({ where: { sku: "PROD-SCAN-10" } });
    expect(prod).not.toBeNull();
    expect(prod?.stockOnHand).toBe(10);
    expect(prod?.isActive).toBe(true);
  });

  it("Step 2 (2:15): Staff direct call to Admin stock adjustment is strictly forbidden (HTTP 403)", async () => {
    const req = new NextRequest("http://localhost:3000/api/inventory/adjustments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: staffCookie,
      },
      body: JSON.stringify({
        productId: targetProduct.id,
        quantityDelta: 5,
        reason: "Unauthorized attempt by staff",
      }),
    });

    const res = await stockAdjustHandler(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");

    // Verify stockOnHand was untouched
    const prod = await prisma.product.findUnique({ where: { sku: "PROD-SCAN-10" } });
    expect(prod?.stockOnHand).toBe(10);
  });

  let createdOrderId = "";
  let orderVersion = 1;

  it("Step 3 (1:15-1:45): Order 3 units of PROD-SCAN-10 -> stock becomes 7 with signed movement", async () => {
    const req = new NextRequest("http://localhost:3000/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: staffCookie,
      },
      body: JSON.stringify({
        customerId: customer.id,
        items: [{ productId: targetProduct.id, quantity: 3 }],
      }),
    });

    const res = await orderCreateHandler(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.orderNumber).toBeDefined();
    expect(body.data.status).toBe("CONFIRMED");
    expect(body.data.items[0].quantity).toBe(3);

    createdOrderId = body.data.id;
    orderVersion = body.data.version;

    // Verify stock is now exactly 7
    const prod = await prisma.product.findUnique({ where: { sku: "PROD-SCAN-10" } });
    expect(prod?.stockOnHand).toBe(7);

    // Verify movement
    const movement = await prisma.inventoryMovement.findFirst({
      where: { orderId: createdOrderId, productId: targetProduct.id },
      orderBy: { createdAt: "desc" },
    });
    expect(movement).not.toBeNull();
    expect(movement?.delta).toBe(-3);
    expect(movement?.quantityAfter).toBe(7);
  });

  it("Step 4 (1:45-2:00): Edit order from 3 to 5 units -> net delta -2 -> stock becomes 5", async () => {
    const req = new NextRequest(`http://localhost:3000/api/orders/${createdOrderId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: staffCookie,
      },
      body: JSON.stringify({
        version: orderVersion,
        items: [{ productId: targetProduct.id, quantity: 5 }],
      }),
    });

    const res = await orderUpdateHandler(req, { params: Promise.resolve({ id: createdOrderId }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.items[0].quantity).toBe(5);
    orderVersion = body.data.version;

    // Verify stock is now 5
    const prod = await prisma.product.findUnique({ where: { sku: "PROD-SCAN-10" } });
    expect(prod?.stockOnHand).toBe(5);

    // Verify net delta movement (-2)
    const movement = await prisma.inventoryMovement.findFirst({
      where: { orderId: createdOrderId, type: "ORDER_EDITED" },
      orderBy: { createdAt: "desc" },
    });
    expect(movement?.delta).toBe(-2);
    expect(movement?.quantityAfter).toBe(5);
  });

  it("Step 5 (2:00-2:15): Cancel order -> restores all 5 units -> stock returns to 10", async () => {
    const req = new NextRequest(`http://localhost:3000/api/orders/${createdOrderId}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: staffCookie,
      },
      body: JSON.stringify({ reason: "Customer demo cancellation" }),
    });

    const res = await orderCancelHandler(req, { params: Promise.resolve({ id: createdOrderId }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("CANCELLED");

    // Verify stock is restored to exactly 10
    const prod = await prisma.product.findUnique({ where: { sku: "PROD-SCAN-10" } });
    expect(prod?.stockOnHand).toBe(10);

    // Verify cancellation restoration movement (+5)
    const movement = await prisma.inventoryMovement.findFirst({
      where: { orderId: createdOrderId, type: "ORDER_CANCELLED" },
      orderBy: { createdAt: "desc" },
    });
    expect(movement?.delta).toBe(5);
    expect(movement?.quantityAfter).toBe(10);
  });

  it("Step 6: Repeated cancellation attempt is rejected with 409 ALREADY_CANCELLED and stock remains 10", async () => {
    const req = new NextRequest(`http://localhost:3000/api/orders/${createdOrderId}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: staffCookie,
      },
      body: JSON.stringify({ reason: "Duplicate cancellation attempt" }),
    });

    const res = await orderCancelHandler(req, { params: Promise.resolve({ id: createdOrderId }) });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("ALREADY_CANCELLED");

    // Verify stock remains untouched at 10 (no double-restoration!)
    const prod = await prisma.product.findUnique({ where: { sku: "PROD-SCAN-10" } });
    expect(prod?.stockOnHand).toBe(10);
  });

  it("Step 7 (2:15-3:00): Staff cannot view audit logs (403), Admin can view all entries", async () => {
    // 1. Staff attempt to view audit logs -> 403
    const staffAuditReq = new NextRequest("http://localhost:3000/api/audit-logs", {
      method: "GET",
      headers: { Cookie: staffCookie },
    });
    const staffAuditRes = await auditListHandler(staffAuditReq);
    expect(staffAuditRes.status).toBe(403);

    // 2. Admin viewing audit logs -> 200 with captured actions
    const adminAuditReq = new NextRequest("http://localhost:3000/api/audit-logs?limit=50", {
      method: "GET",
      headers: { Cookie: adminCookie },
    });
    const adminAuditRes = await auditListHandler(adminAuditReq);
    expect(adminAuditRes.status).toBe(200);
    const body = await adminAuditRes.json();
    expect(body.data.logs.length).toBeGreaterThan(0);

    // Verify the demo order mutations are captured in audit trail
    const orderAuditLogs = body.data.logs.filter((l: any) => l.entityId === createdOrderId);
    expect(orderAuditLogs.length).toBeGreaterThanOrEqual(3); // CREATE, UPDATE, CANCEL
  });
});
