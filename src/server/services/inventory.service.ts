import { prisma } from "@/lib/db";
import { StockAdjustmentInput } from "@/lib/validation/inventory";
import { MovementType } from "@prisma/client";

export class InsufficientStockError extends Error {
  public readonly statusCode = 409;
  constructor(message: string = "Insufficient stock to fulfill request") {
    super(message);
    this.name = "InsufficientStockError";
  }
}

export class ProductNotFoundError extends Error {
  public readonly statusCode = 404;
  constructor(message: string = "Product not found") {
    super(message);
    this.name = "ProductNotFoundError";
  }
}

export interface ListMovementsParams {
  productId?: string;
  page?: number;
  limit?: number;
}

export async function listInventoryMovements({
  productId,
  page = 1,
  limit = 20,
}: ListMovementsParams = {}) {
  const skip = (page - 1) * limit;
  const where = productId ? { productId } : {};

  const [movements, totalCount] = await Promise.all([
    prisma.inventoryMovement.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true } },
        actor: { select: { id: true, name: true, email: true, role: true } },
        order: { select: { id: true, orderNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.inventoryMovement.count({ where }),
  ]);

  return {
    movements,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}

/**
 * Executes an atomic stock adjustment enforcing the invariant that stockOnHand >= 0.
 * Recorded with a signed delta, new balance, and audit record in a single transaction.
 */
export async function adjustProductStock(
  input: StockAdjustmentInput,
  actorId: string
) {
  const { productId, delta, reason } = input;

  return prisma.$transaction(async (tx) => {
    // 1. Verify product exists
    const product = await tx.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new ProductNotFoundError(`Product with ID '${productId}' not found.`);
    }

    // 2. Conditional atomic SQL execution to guarantee stockOnHand >= 0 under concurrency
    let updatedRows: Array<{ id: string; stockOnHand: number }>;

    if (delta < 0) {
      // Deduction requires current stock to be at least |delta|
      const requiredStock = Math.abs(delta);
      updatedRows = await tx.$queryRaw<Array<{ id: string; stockOnHand: number }>>`
        UPDATE "Product"
        SET "stockOnHand" = "stockOnHand" + ${delta},
            "updatedAt" = NOW()
        WHERE "id" = ${productId}
          AND "stockOnHand" >= ${requiredStock}
        RETURNING "id", "stockOnHand";
      `;

      if (updatedRows.length === 0) {
        throw new InsufficientStockError(
          `Cannot deduct ${requiredStock} units. Current available stock is ${product.stockOnHand}.`
        );
      }
    } else {
      // Stock addition
      updatedRows = await tx.$queryRaw<Array<{ id: string; stockOnHand: number }>>`
        UPDATE "Product"
        SET "stockOnHand" = "stockOnHand" + ${delta},
            "updatedAt" = NOW()
        WHERE "id" = ${productId}
        RETURNING "id", "stockOnHand";
      `;
    }

    const newStock = updatedRows[0]!.stockOnHand;

    // 3. Record Inventory Movement
    const movement = await tx.inventoryMovement.create({
      data: {
        productId,
        actorId,
        type: MovementType.ADJUSTMENT,
        delta,
        quantityAfter: newStock,
        reason,
      },
      include: {
        product: true,
        actor: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // 4. Record Audit Log
    await tx.auditLog.create({
      data: {
        actorId,
        action: "STOCK_ADJUSTMENT",
        entityType: "Product",
        entityId: productId,
        beforeJson: JSON.stringify({ stockOnHand: product.stockOnHand }),
        afterJson: JSON.stringify({
          stockOnHand: newStock,
          delta,
          reason,
          movementId: movement.id,
        }),
      },
    });

    return {
      product: {
        ...product,
        stockOnHand: newStock,
      },
      movement,
    };
  });
}

