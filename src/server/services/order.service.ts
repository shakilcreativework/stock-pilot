import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import {
  CreateOrderInput,
  UpdateOrderInput,
  normalizeOrderItems,
} from "@/lib/validation/order";
import {
  InsufficientStockError,
  ProductNotFoundError,
} from "@/server/services/inventory.service";
import {
  OrderConflictError,
  AlreadyCancelledError,
} from "@/lib/errors/api-response";
import { MovementType, OrderStatus, Prisma } from "@prisma/client";

export interface ListOrdersParams {
  customerId?: string;
  status?: OrderStatus;
  page?: number;
  limit?: number;
}

/**
 * Generates a human-friendly unique order number (e.g. ORD-20261105-9B2F).
 */
function generateOrderNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${dateStr}-${randomSuffix}`;
}

export async function listOrders({
  customerId,
  status,
  page = 1,
  limit = 20,
}: ListOrdersParams = {}) {
  const skip = (page - 1) * limit;
  const where: Prisma.OrderWhereInput = {
    ...(customerId ? { customerId } : {}),
    ...(status ? { status } : {}),
  };

  const [orders, totalCount] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, role: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}

export async function getOrderById(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      createdBy: { select: { id: true, name: true, role: true } },
      items: {
        include: {
          product: true,
        },
      },
      movements: {
        include: {
          product: { select: { name: true, sku: true } },
          actor: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

/**
 * Creates an order atomically.
 * Deducts stock using conditional SQL updates to prevent overselling under high concurrency.
 * Supports idempotency keys to eliminate duplicate order submissions.
 */
export async function createOrder(input: CreateOrderInput, actorId: string) {
  const normalizedLines = normalizeOrderItems(input.items);
  const payloadHash = createHash("sha256")
    .update(JSON.stringify({ customerId: input.customerId, items: normalizedLines }))
    .digest("hex");

  // Idempotency check if key is provided
  if (input.idempotencyKey) {
    const existingKey = await prisma.idempotencyRecord.findUnique({
      where: {
        scope_key: {
          scope: "CREATE_ORDER",
          key: input.idempotencyKey,
        },
      },
    });

    if (existingKey) {
      if (existingKey.requestHash !== payloadHash) {
        throw new OrderConflictError(
          "Idempotency key was previously submitted with a different order payload."
        );
      }
      if (existingKey.responseReference) {
        return {
          order: JSON.parse(existingKey.responseReference),
          isCached: true,
        };
      }
    }
  }

  // Execute entire order creation within an atomic database transaction
  const createdOrder = await prisma.$transaction(
    async (tx) => {
      // 1. Verify customer exists
      const customer = await tx.customer.findUnique({
        where: { id: input.customerId },
      });
      if (!customer) {
        throw new ProductNotFoundError("Selected customer does not exist.");
      }

      // 2. Fetch authoritative products
      const productIds = normalizedLines.map((l) => l.productId);
      const dbProducts = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      if (dbProducts.length !== productIds.length) {
        throw new ProductNotFoundError("One or more selected products do not exist.");
      }

      const productMap = new Map(dbProducts.map((p) => [p.id, p]));

      let orderTotalMinor = 0;
      const orderItemsToCreate: Array<{
        productId: string;
        quantity: number;
        unitPriceMinor: number;
        lineTotalMinor: number;
      }> = [];

      const stockDeductionResults: Array<{
        productId: string;
        quantityDeducted: number;
        stockAfter: number;
      }> = [];

      // 3. Conditional atomic stock deductions in deterministic ID sort order
      for (const line of normalizedLines) {
        const prod = productMap.get(line.productId)!;

        if (!prod.isActive) {
          throw new OrderConflictError(
            `Product '${prod.name}' (${prod.sku}) is archived and cannot be ordered.`
          );
        }

        // CONDITIONAL SQL UPDATE (PRD Section 8 Invariant)
        // Only updates if product is active and stockOnHand >= required quantity
        const updatedRows = await tx.$queryRaw<Array<{ id: string; stockOnHand: number }>>`
          UPDATE "Product"
          SET "stockOnHand" = "stockOnHand" - ${line.quantity},
              "updatedAt" = NOW()
          WHERE "id" = ${line.productId}
            AND "isActive" = TRUE
            AND "stockOnHand" >= ${line.quantity}
          RETURNING "id", "stockOnHand";
        `;

        if (updatedRows.length === 0) {
          throw new InsufficientStockError(
            `Insufficient stock for '${prod.name}'. Requested ${line.quantity}, but only ${prod.stockOnHand} available.`
          );
        }

        const newStock = updatedRows[0]!.stockOnHand;
        stockDeductionResults.push({
          productId: line.productId,
          quantityDeducted: line.quantity,
          stockAfter: newStock,
        });

        const lineTotal = line.quantity * prod.priceMinor;
        orderTotalMinor += lineTotal;

        orderItemsToCreate.push({
          productId: line.productId,
          quantity: line.quantity,
          unitPriceMinor: prod.priceMinor, // Price snapshot
          lineTotalMinor: lineTotal,
        });
      }

      // 4. Create the Order entity
      const order = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          customerId: input.customerId,
          status: OrderStatus.CONFIRMED,
          totalMinor: orderTotalMinor,
          version: 1,
          createdById: actorId,
          items: {
            create: orderItemsToCreate,
          },
        },
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      });

      // 5. Record Inventory Movement for each deducted product
      for (const res of stockDeductionResults) {
        await tx.inventoryMovement.create({
          data: {
            productId: res.productId,
            orderId: order.id,
            actorId,
            type: MovementType.ORDER_CREATED,
            delta: -res.quantityDeducted, // Negative delta
            quantityAfter: res.stockAfter,
            reason: `Order created (${order.orderNumber})`,
          },
        });
      }

      // 6. Record Audit Log
      await tx.auditLog.create({
        data: {
          actorId,
          action: "ORDER_CREATED",
          entityType: "Order",
          entityId: order.id,
          afterJson: JSON.stringify({
            orderNumber: order.orderNumber,
            totalMinor: order.totalMinor,
            itemCount: order.items.length,
          }),
        },
      });

      // 7. Persist Idempotency Record if key was provided
      if (input.idempotencyKey) {
        await tx.idempotencyRecord.create({
          data: {
            scope: "CREATE_ORDER",
            key: input.idempotencyKey,
            requestHash: payloadHash,
            responseReference: JSON.stringify(order),
            status: "COMPLETED",
          },
        });
      }

      return order;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    }
  );

  return {
    order: createdOrder,
    isCached: false,
  };
}

/**
 * Edits an existing confirmed order.
 * Calculates net quantity delta per item (`newQty - oldQty`).
 * Increments/decrements stock atomically and uses optimistic version locking.
 */
export async function updateOrder(
  orderId: string,
  input: UpdateOrderInput,
  actorId: string
) {
  const normalizedNewLines = normalizeOrderItems(input.items);

  return prisma.$transaction(async (tx) => {
    // 1. Fetch current order with line items
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
      },
    });

    if (!order) {
      throw new ProductNotFoundError(`Order with ID '${orderId}' not found.`);
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new OrderConflictError(
        "Cannot edit an order that has already been cancelled."
      );
    }

    // Optimistic Concurrency Control: verify version matches
    if (order.version !== input.version) {
      throw new OrderConflictError(
        `Order was modified concurrently. Expected version ${input.version}, but database version is ${order.version}. Please refresh and retry.`
      );
    }

    // 2. Build product delta map
    const existingItemsMap = new Map(order.items.map((item) => [item.productId, item]));
    const newItemsMap = new Map(
      normalizedNewLines.map((item) => [item.productId, item.quantity])
    );

    const allProductIds = Array.from(
      new Set([...existingItemsMap.keys(), ...newItemsMap.keys()])
    ).sort();

    // Fetch authoritative product records
    const dbProducts = await tx.product.findMany({
      where: { id: { in: allProductIds } },
    });
    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    let newOrderTotalMinor = 0;
    const movementsToCreate: Array<{
      productId: string;
      delta: number;
      quantityAfter: number;
    }> = [];

    // 3. Process each product delta in sorted ID order
    for (const prodId of allProductIds) {
      const prod = productMap.get(prodId);
      if (!prod) {
        throw new ProductNotFoundError(`Product ID '${prodId}' not found.`);
      }

      const oldQty = existingItemsMap.get(prodId)?.quantity || 0;
      const newQty = newItemsMap.get(prodId) || 0;
      const delta = newQty - oldQty;

      if (delta === 0) {
        // Line quantity unchanged, keep line total
        if (newQty > 0) {
          const item = existingItemsMap.get(prodId)!;
          newOrderTotalMinor += item.lineTotalMinor;
        }
        continue;
      }

      let newStockOnHand: number;

      if (delta > 0) {
        // Need to deduct additional stock
        const updatedRows = await tx.$queryRaw<Array<{ id: string; stockOnHand: number }>>`
          UPDATE "Product"
          SET "stockOnHand" = "stockOnHand" - ${delta},
              "updatedAt" = NOW()
          WHERE "id" = ${prodId}
            AND "isActive" = TRUE
            AND "stockOnHand" >= ${delta}
          RETURNING "id", "stockOnHand";
        `;

        if (updatedRows.length === 0) {
          throw new InsufficientStockError(
            `Cannot increase quantity for '${prod.name}'. Additional ${delta} units requested, but stock is insufficient.`
          );
        }
        newStockOnHand = updatedRows[0]!.stockOnHand;
      } else {
        // Negative delta: restore stock
        const restoreAmount = Math.abs(delta);
        const updatedRows = await tx.$queryRaw<Array<{ id: string; stockOnHand: number }>>`
          UPDATE "Product"
          SET "stockOnHand" = "stockOnHand" + ${restoreAmount},
              "updatedAt" = NOW()
          WHERE "id" = ${prodId}
          RETURNING "id", "stockOnHand";
        `;
        newStockOnHand = updatedRows[0]!.stockOnHand;
      }

      movementsToCreate.push({
        productId: prodId,
        delta: -delta, // Inverse for inventory perspective: positive order delta consumes inventory
        quantityAfter: newStockOnHand,
      });

      if (newQty > 0) {
        const unitPrice =
          existingItemsMap.get(prodId)?.unitPriceMinor ?? prod.priceMinor;
        newOrderTotalMinor += newQty * unitPrice;
      }
    }

    // 4. Replace Order Items
    await tx.orderItem.deleteMany({ where: { orderId } });

    const newOrderItems = normalizedNewLines.map((line) => {
      const prod = productMap.get(line.productId)!;
      const existing = existingItemsMap.get(line.productId);
      const unitPriceMinor = existing ? existing.unitPriceMinor : prod.priceMinor;
      return {
        orderId,
        productId: line.productId,
        quantity: line.quantity,
        unitPriceMinor,
        lineTotalMinor: line.quantity * unitPriceMinor,
      };
    });

    await tx.orderItem.createMany({ data: newOrderItems });

    // 5. Update Order with incremented version and new total
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        totalMinor: newOrderTotalMinor,
        version: { increment: 1 },
      },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });

    // 6. Record Inventory Movements
    for (const mov of movementsToCreate) {
      await tx.inventoryMovement.create({
        data: {
          productId: mov.productId,
          orderId,
          actorId,
          type: MovementType.ORDER_EDITED,
          delta: mov.delta,
          quantityAfter: mov.quantityAfter,
          reason: `Order edited (${updatedOrder.orderNumber})`,
        },
      });
    }

    // 7. Audit Log
    await tx.auditLog.create({
      data: {
        actorId,
        action: "ORDER_EDITED",
        entityType: "Order",
        entityId: orderId,
        beforeJson: JSON.stringify({
          version: order.version,
          totalMinor: order.totalMinor,
          items: order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
        afterJson: JSON.stringify({
          version: updatedOrder.version,
          totalMinor: updatedOrder.totalMinor,
          items: normalizedNewLines,
        }),
      },
    });

    return updatedOrder;
  });
}

/**
 * Cancels an order and restores inventory quantities exactly once.
 * Repeated calls return the already-cancelled state without duplicating stock restoration.
 */
export async function cancelOrder(orderId: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    // 1. Fetch order
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
      },
    });

    if (!order) {
      throw new ProductNotFoundError(`Order with ID '${orderId}' not found.`);
    }

    // Idempotent cancellation check:
    // Repeated cancellation request must NOT restore stock twice!
    if (order.status === OrderStatus.CANCELLED) {
      throw new AlreadyCancelledError(
        `Order '${order.orderNumber}' is already cancelled. Stock was already restored.`
      );
    }

    // 2. Atomically mark order as CANCELLED
    const cancelledRows = await tx.$queryRaw<Array<{ id: string }>>`
      UPDATE "Order"
      SET "status" = 'CANCELLED'::"OrderStatus",
          "cancelledAt" = NOW(),
          "updatedAt" = NOW()
      WHERE "id" = ${orderId}
        AND "status" = 'CONFIRMED'::"OrderStatus"
      RETURNING "id";
    `;

    if (cancelledRows.length === 0) {
      throw new AlreadyCancelledError(
        `Order was concurrently cancelled by another transaction.`
      );
    }

    // 3. Restore inventory for all items in the order
    for (const item of order.items) {
      const updatedRows = await tx.$queryRaw<Array<{ id: string; stockOnHand: number }>>`
        UPDATE "Product"
        SET "stockOnHand" = "stockOnHand" + ${item.quantity},
            "updatedAt" = NOW()
        WHERE "id" = ${item.productId}
        RETURNING "id", "stockOnHand";
      `;

      const newStock = updatedRows[0]!.stockOnHand;

      await tx.inventoryMovement.create({
        data: {
          productId: item.productId,
          orderId,
          actorId,
          type: MovementType.ORDER_CANCELLED,
          delta: item.quantity, // Positive delta restored to stock
          quantityAfter: newStock,
          reason: `Order cancelled (${order.orderNumber}) - Restored ${item.quantity} units`,
        },
      });
    }

    // 4. Audit Log
    await tx.auditLog.create({
      data: {
        actorId,
        action: "ORDER_CANCELLED",
        entityType: "Order",
        entityId: orderId,
        beforeJson: JSON.stringify({ status: OrderStatus.CONFIRMED }),
        afterJson: JSON.stringify({ status: OrderStatus.CANCELLED }),
      },
    });

    const finalOrder = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });

    return finalOrder;
  });
}
