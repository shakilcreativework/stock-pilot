import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { listInventoryMovements } from "@/server/services/inventory.service";
import { jsonSuccess, handleApiError } from "@/lib/errors/api-response";

export async function GET(req: NextRequest) {
  try {
    await requireAuth("inventory:read", req);

    const searchParams = req.nextUrl.searchParams;
    const productId = searchParams.get("productId") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await listInventoryMovements({ productId, page, limit });
    return jsonSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
