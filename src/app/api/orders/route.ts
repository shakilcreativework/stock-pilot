import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { createOrderSchema } from "@/lib/validation/order";
import { listOrders, createOrder } from "@/server/services/order.service";
import { jsonSuccess, handleApiError } from "@/lib/errors/api-response";
import { OrderStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireAuth("orders:read", req);

    const searchParams = req.nextUrl.searchParams;
    const customerId = searchParams.get("customerId") || undefined;
    const statusParam = searchParams.get("status") as OrderStatus | null;
    const status = statusParam || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await listOrders({ customerId, status, page, limit });
    return jsonSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth("orders:write", req);
    const body = await req.json();
    const validated = createOrderSchema.parse(body);

    const { order, isCached } = await createOrder(validated, user.id);
    return jsonSuccess(order, isCached ? 200 : 201);
  } catch (error) {
    return handleApiError(error);
  }
}
