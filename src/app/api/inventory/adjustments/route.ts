import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { stockAdjustmentSchema } from "@/lib/validation/inventory";
import { adjustProductStock } from "@/server/services/inventory.service";
import { jsonSuccess, handleApiError } from "@/lib/errors/api-response";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth("inventory:adjust", req);
    const body = await req.json();
    const validated = stockAdjustmentSchema.parse(body);

    const result = await adjustProductStock(validated, user.id);
    return jsonSuccess(result, 200);
  } catch (error) {
    return handleApiError(error);
  }
}
