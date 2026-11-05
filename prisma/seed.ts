import { Role, MovementType } from "@prisma/client";
import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";

async function main() {
  console.log("🌱 Starting deterministic database seeding...");

  // 1. Clean existing records in correct relation order
  await prisma.auditLog.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.idempotencyRecord.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  // 2. Seed Users (Admin & Staff)
  const adminPasswordHash = hashPassword("Admin123!");
  const staffPasswordHash = hashPassword("Staff123!");

  const adminUser = await prisma.user.create({
    data: {
      name: "Alex Vance (Admin)",
      email: "admin@stockpilot.io",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const staffUser = await prisma.user.create({
    data: {
      name: "Sam Taylor (Staff)",
      email: "staff@stockpilot.io",
      passwordHash: staffPasswordHash,
      role: Role.STAFF,
    },
  });

  console.log(`✓ Created Users: Admin (${adminUser.email}) and Staff (${staffUser.email})`);

  // 3. Seed Categories
  const catHardware = await prisma.category.create({ data: { name: "Scanning & Hardware" } });
  const catSupplies = await prisma.category.create({ data: { name: "Packaging & Supplies" } });
  const catSafety = await prisma.category.create({ data: { name: "Safety & Equipment" } });

  console.log("✓ Created 3 Product Categories");

  // 4. Seed Products
  // Important per PRD Section 15:
  // - At least one product with stock 10 (for 3-min demo script: order 3 -> leaves 7 -> cancel -> restores 10)
  // - At least one low-stock product (< lowStockThreshold)
  const productsData = [
    {
      sku: "PROD-SCAN-10",
      name: "Pro Wireless Barcode Scanner",
      description: "High-speed 2D handheld warehouse Bluetooth scanner",
      categoryId: catHardware.id,
      priceMinor: 14999, // $149.99
      stockOnHand: 10,   // Key demo product: exactly 10 units
      lowStockThreshold: 3,
    },
    {
      sku: "PROD-LABEL-01",
      name: "Thermal Shipping Labels (1000/roll)",
      description: "Direct thermal 4x6 inch continuous labels",
      categoryId: catSupplies.id,
      priceMinor: 1999, // $19.99
      stockOnHand: 2,   // Low stock alert trigger
      lowStockThreshold: 5,
    },
    {
      sku: "PROD-SCALE-02",
      name: "Heavy-Duty Digital Platform Scale 150kg",
      description: "Precision calibration platform scale with stainless platter",
      categoryId: catHardware.id,
      priceMinor: 28900, // $289.00
      stockOnHand: 15,
      lowStockThreshold: 4,
    },
    {
      sku: "PROD-TAPE-03",
      name: "Reinforced Water-Activated Kraft Tape",
      description: "Fiberglass reinforced packaging gummed tape roll",
      categoryId: catSupplies.id,
      priceMinor: 1250, // $12.50
      stockOnHand: 45,
      lowStockThreshold: 10,
    },
    {
      sku: "PROD-VEST-04",
      name: "High-Visibility Safety Vest (Class 2)",
      description: "Reflective breathable mesh vest with multi-pocket layout",
      categoryId: catSafety.id,
      priceMinor: 1599, // $15.99
      stockOnHand: 25,
      lowStockThreshold: 8,
    },
    {
      sku: "PROD-GLOVE-05",
      name: "Cut-Resistant Warehouse Nitrile Gloves",
      description: "ANSI Level A4 palm-coated grip gloves (Pair)",
      categoryId: catSafety.id,
      priceMinor: 899, // $8.99
      stockOnHand: 60,
      lowStockThreshold: 15,
    },
    {
      sku: "PROD-DISP-06",
      name: "Industrial Tape Dispenser Gun",
      description: "Heavy-duty steel frame with adjustable tension brake",
      categoryId: catSupplies.id,
      priceMinor: 2450, // $24.50
      stockOnHand: 12,
      lowStockThreshold: 5,
    },
    {
      sku: "PROD-WRAP-07",
      name: "Pallet Stretch Wrap 80 Gauge 18x1500ft",
      description: "Industrial strength puncture resistant cast stretch film",
      categoryId: catSupplies.id,
      priceMinor: 3200, // $32.00
      stockOnHand: 8,
      lowStockThreshold: 5,
    },
  ];

  for (const item of productsData) {
    const product = await prisma.product.create({
      data: item,
    });

    // Record initial inventory movement for audit and accounting invariant
    await prisma.inventoryMovement.create({
      data: {
        productId: product.id,
        actorId: adminUser.id,
        type: MovementType.INITIAL,
        delta: item.stockOnHand,
        quantityAfter: item.stockOnHand,
        reason: "Initial warehouse inventory onboarding seed",
      },
    });
  }

  console.log(`✓ Seeded ${productsData.length} products with initial inventory movements`);

  // 5. Seed Customers
  const customersData = [
    { name: "Apex Logistics Ltd", email: "procurement@apexlogistics.com", phone: "+1 555-019-2831" },
    { name: "Beacon Retail Distribution", email: "orders@beaconretail.com", phone: "+1 555-018-9921" },
    { name: "Crestline Manufacturing Co", email: "supplies@crestlinemfg.com", phone: "+1 555-014-4412" },
  ];

  for (const cust of customersData) {
    await prisma.customer.create({ data: cust });
  }

  console.log("✓ Seeded 3 business customers");

  // 6. Record Audit Log for the seed operation
  await prisma.auditLog.create({
    data: {
      actorId: adminUser.id,
      action: "DATABASE_INITIAL_SEED",
      entityType: "System",
      entityId: "system-seed",
      afterJson: JSON.stringify({ seededProducts: productsData.length, seededUsers: 2 }),
    },
  });

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
