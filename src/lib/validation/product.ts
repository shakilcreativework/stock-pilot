import { z } from "zod";

export const createProductSchema = z.object({
  sku: z
    .string()
    .min(3, "SKU must be at least 3 characters")
    .max(50, "SKU must not exceed 50 characters")
    .regex(/^[A-Z0-9_-]+$/, "SKU must contain only uppercase letters, numbers, hyphens, and underscores")
    .transform((val) => val.trim().toUpperCase()),
  name: z.string().min(2, "Product name must be at least 2 characters").max(120),
  description: z.string().max(500).optional().nullable(),
  categoryId: z.string().min(1, "A valid category must be selected"),
  priceMinor: z.number().int("Price must be an integer in cents").nonnegative("Price cannot be negative"),
  initialStock: z.number().int("Initial stock must be an integer").nonnegative("Initial stock cannot be negative").default(0),
  lowStockThreshold: z.number().int().nonnegative("Threshold must be non-negative").default(5),
});

export const updateProductSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
  categoryId: z.string().min(1).optional(),
  priceMinor: z.number().int().nonnegative().optional(),
  lowStockThreshold: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

