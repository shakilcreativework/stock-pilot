import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(2, "Customer name must be at least 2 characters").max(100),
  email: z.string().email("A valid email address is required").optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

