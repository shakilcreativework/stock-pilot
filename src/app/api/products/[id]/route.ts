import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { updateProductSchema } from "@/lib/validation/product";
import { getProductById, updateProduct } from "@/server/services/product.service";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/errors/api-response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth("products:read", req);
    const { id } = await params;
    const product = await getProductById(id);

    if (!product) {
      return jsonError("NOT_FOUND", "Product not found", 404);
    }

    return jsonSuccess(product);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth("products:write", req);
    const { id } = await params;
    const body = await req.json();
    const validated = updateProductSchema.parse(body);

    const updated = await updateProduct(id, validated, user.id);
    return jsonSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
