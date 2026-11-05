import { prisma } from "@/lib/db";
import { CreateProductInput, UpdateProductInput } from "@/lib/validation/product";
import { MovementType, Prisma } from "@prisma/client";

export interface ListProductsParams {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export async function listProducts({
  search,
  categoryId,
  isActive,
  page = 1,
  limit = 10,
}: ListProductsParams = {}) {
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {
    ...(categoryId ? { categoryId } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [products, totalCount] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}

export async function getProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      movements: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          actor: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
}

export async function createProduct(input: CreateProductInput, actorId: string) {
  // Check SKU uniqueness
  const existingSku = await prisma.product.findUnique({
    where: { sku: input.sku },
  });

  if (existingSku) {
    const error = new Error(`Product with SKU '${input.sku}' already exists.`);
    error.name = "DuplicateSkuError";
    throw error;
  }

  // Atomically create product and record initial inventory movement + audit log
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        sku: input.sku,
        name: input.name,
        description: input.description,
        categoryId: input.categoryId,
        priceMinor: input.priceMinor,
        stockOnHand: input.initialStock,
        lowStockThreshold: input.lowStockThreshold,
      },
      include: { category: true },
    });

    if (input.initialStock > 0) {
      await tx.inventoryMovement.create({
        data: {
          productId: product.id,
          actorId,
          type: MovementType.INITIAL,
          delta: input.initialStock,
          quantityAfter: input.initialStock,
          reason: "Initial product creation stock balance",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId,
        action: "PRODUCT_CREATED",
        entityType: "Product",
        entityId: product.id,
        afterJson: JSON.stringify(product),
      },
    });

    return product;
  });
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
  actorId: string
) {
  const currentProduct = await prisma.product.findUnique({
    where: { id },
  });

  if (!currentProduct) {
    const error = new Error(`Product with ID '${id}' not found.`);
    error.name = "NotFoundError";
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.product.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.priceMinor !== undefined ? { priceMinor: input.priceMinor } : {}),
        ...(input.lowStockThreshold !== undefined
          ? { lowStockThreshold: input.lowStockThreshold }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      include: { category: true },
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: "PRODUCT_UPDATED",
        entityType: "Product",
        entityId: id,
        beforeJson: JSON.stringify(currentProduct),
        afterJson: JSON.stringify(updated),
      },
    });

    return updated;
  });
}

