import { z } from "zod";

export const orderItemInputSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z
    .number()
    .int("Quantity must be an integer")
    .positive("Quantity must be greater than zero"),
});

export const createOrderSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  idempotencyKey: z.string().min(8).max(128).optional(),
  items: z
    .array(orderItemInputSchema)
    .min(1, "Order must contain at least one product line"),
});

export const updateOrderSchema = z.object({
  version: z.number().int().positive("Order version is required for optimistic locking"),
  items: z
    .array(orderItemInputSchema)
    .min(1, "Order must contain at least one product line"),
});

export type OrderItemInput = z.infer<typeof orderItemInputSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;

/**
 * Merges duplicate product line items in order payload to prevent locking anomalies.
 */
export function normalizeOrderItems(items: OrderItemInput[]): OrderItemInput[] {
  const mergedMap = new Map<string, number>();

  for (const item of items) {
    const current = mergedMap.get(item.productId) || 0;
    mergedMap.set(item.productId, current + item.quantity);
  }

  // Sort by productId to guarantee consistent lock acquisition order across transactions
  return Array.from(mergedMap.entries())
    .map(([productId, quantity]) => ({ productId, quantity }))
    .sort((a, b) => a.productId.localeCompare(b.productId));
}

