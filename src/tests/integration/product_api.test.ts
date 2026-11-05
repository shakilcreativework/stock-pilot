import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { POST as createProductRoute, GET as listProductsRoute } from "@/app/api/products/route";
import { PATCH as updateProductRoute } from "@/app/api/products/[id]/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";

describe("Product Management & RBAC API Integration", () => {
  let adminCookie: string;
  let staffCookie: string;
  let categoryId: string;

  beforeAll(async () => {
    // Fetch seeded admin & staff
    const admin = await prisma.user.findUnique({ where: { email: "admin@stockpilot.io" } });
    const staff = await prisma.user.findUnique({ where: { email: "staff@stockpilot.io" } });
    const category = await prisma.category.findFirst();

    if (!admin || !staff || !category) {
      throw new Error("Seed data missing. Run seed before running integration tests.");
    }

    categoryId = category.id;
    adminCookie = await createSession(admin.id);
    staffCookie = await createSession(staff.id);
  });

  afterAll(async () => {
    // Clean up test-created products
    await prisma.inventoryMovement.deleteMany({
      where: { product: { sku: { startsWith: "TEST-PROD-" } } },
    });
    await prisma.product.deleteMany({
      where: { sku: { startsWith: "TEST-PROD-" } },
    });
    await prisma.$disconnect();
  });

  it("allows Admin to create a product with initial inventory movement", async () => {
    const sku = "TEST-PROD-001";
    const req = new NextRequest("http://localhost:3000/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `stockpilot_session=${adminCookie}`,
      },
      body: JSON.stringify({
        sku,
        name: "Test Barcode Reader",
        description: "Integration testing product",
        categoryId,
        priceMinor: 9900,
        initialStock: 25,
        lowStockThreshold: 5,
      }),
    });

    const res = await createProductRoute(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.sku).toBe(sku);
    expect(json.data.stockOnHand).toBe(25);

    // Verify initial inventory movement was recorded
    const movement = await prisma.inventoryMovement.findFirst({
      where: { productId: json.data.id },
    });
    expect(movement).toBeDefined();
    expect(movement?.delta).toBe(25);
    expect(movement?.quantityAfter).toBe(25);
  });

  it("strictly rejects duplicate SKU with 409", async () => {
    const sku = "TEST-PROD-001";
    const req = new NextRequest("http://localhost:3000/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `stockpilot_session=${adminCookie}`,
      },
      body: JSON.stringify({
        sku,
        name: "Duplicate SKU Tester",
        categoryId,
        priceMinor: 5000,
        initialStock: 5,
      }),
    });

    const res = await createProductRoute(req);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it("strictly forbids Staff from creating products (HTTP 403)", async () => {
    const req = new NextRequest("http://localhost:3000/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `stockpilot_session=${staffCookie}`,
      },
      body: JSON.stringify({
        sku: "TEST-PROD-FORBIDDEN",
        name: "Staff Attempted Product",
        categoryId,
        priceMinor: 1000,
        initialStock: 10,
      }),
    });

    const res = await createProductRoute(req);
    expect(res.status).toBe(403);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("FORBIDDEN");

    // Verify product was NOT created in DB
    const forbiddenProd = await prisma.product.findUnique({
      where: { sku: "TEST-PROD-FORBIDDEN" },
    });
    expect(forbiddenProd).toBeNull();
  });

  it("allows Staff to read products list", async () => {
    const req = new NextRequest("http://localhost:3000/api/products?page=1&limit=5", {
      method: "GET",
      headers: {
        Cookie: `stockpilot_session=${staffCookie}`,
      },
    });

    const res = await listProductsRoute(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.products.length).toBeGreaterThan(0);
    expect(json.data.pagination.limit).toBe(5);
  });

  it("allows Admin to update product metadata without affecting stock", async () => {
    const prod = await prisma.product.findFirst({ where: { sku: "TEST-PROD-001" } });
    expect(prod).not.toBeNull();

    const req = new NextRequest(`http://localhost:3000/api/products/${prod!.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `stockpilot_session=${adminCookie}`,
      },
      body: JSON.stringify({
        name: "Updated Barcode Scanner Pro",
        priceMinor: 11900,
      }),
    });

    const res = await updateProductRoute(req, {
      params: Promise.resolve({ id: prod!.id }),
    });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.name).toBe("Updated Barcode Scanner Pro");
    expect(json.data.priceMinor).toBe(11900);
    // Stock remains unchanged!
    expect(json.data.stockOnHand).toBe(prod!.stockOnHand);
  });
});
