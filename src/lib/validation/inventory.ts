import { z } from "zod";

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  delta: z
    .number()
    .int("Delta must be a whole integer")
    .refine((val) => val !== 0, "Adjustment delta cannot be 0"),
  reason: z
    .string()
    .min(3, "A valid reason of at least 3 characters is required")
    .max(250, "Reason must not exceed 250 characters"),
});

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;

