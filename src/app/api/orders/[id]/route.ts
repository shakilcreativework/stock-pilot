import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { updateOrderSchema } from "@/lib/validation/order";
import { getOrderById, updateOrder } from "@/server/services/order.service";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/errors/api-response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth("orders:read", req);
    const { id } = await params;
    const order = await getOrderById(id);

    if (!order) {
      return jsonError("NOT_FOUND", "Order not found", 404);
    }

    return jsonSuccess(order);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth("orders:write", req);
    const { id } = await params;
    const body = await req.json();
    const validated = updateOrderSchema.parse(body);

    const updated = await updateOrder(id, validated, user.id);
    return jsonSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

