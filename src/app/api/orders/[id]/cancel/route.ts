import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { cancelOrder } from "@/server/services/order.service";
import { jsonSuccess, handleApiError } from "@/lib/errors/api-response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth("orders:write", req);
    const { id } = await params;

    const cancelled = await cancelOrder(id, user.id);
    return jsonSuccess(cancelled);
  } catch (error) {
    return handleApiError(error);
  }
}

