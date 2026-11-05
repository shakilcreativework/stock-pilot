import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GET as getCustomersRoute, POST as createCustomerRoute } from "@/app/api/customers/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";

describe("Customer Management API Integration", () => {
  let adminCookie: string;
  let testCustomerId: string;

  beforeAll(async () => {
    const admin = await prisma.user.findUnique({ where: { email: "admin@stockpilot.io" } });
    if (!admin) throw new Error("Admin user missing");
    adminCookie = await createSession(admin.id);
  });

  afterAll(async () => {
    if (testCustomerId) {
      await prisma.customer.deleteMany({ where: { id: testCustomerId } });
    }
    await prisma.$disconnect();
  });

  it("FR-04: creates a new business customer and records an audit log", async () => {
    const req = new NextRequest("http://localhost:3000/api/customers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `stockpilot_session=${adminCookie}`,
      },
      body: JSON.stringify({
        name: "Zenith Global Logistics",
        email: "contact@zenithglobal.com",
        phone: "+1 555-019-8877",
      }),
    });

    const res = await createCustomerRoute(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.name).toBe("Zenith Global Logistics");
    testCustomerId = json.data.id;

    // Verify Audit record was created
    const audit = await prisma.auditLog.findFirst({
      where: { entityType: "Customer", entityId: testCustomerId },
    });
    expect(audit).toBeDefined();
    expect(audit?.action).toBe("CUSTOMER_CREATED");
  });

  it("FR-04: retrieves customers list with order count statistics", async () => {
    const req = new NextRequest("http://localhost:3000/api/customers?search=Zenith", {
      method: "GET",
      headers: {
        Cookie: `stockpilot_session=${adminCookie}`,
      },
    });

    const res = await getCustomersRoute(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
    expect(json.data[0].name).toBe("Zenith Global Logistics");
    expect(json.data[0]._count).toBeDefined();
  });
});

