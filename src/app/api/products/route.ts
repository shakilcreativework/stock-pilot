import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { createProductSchema } from "@/lib/validation/product";
import { listProducts, createProduct } from "@/server/services/product.service";
import { jsonSuccess, handleApiError } from "@/lib/errors/api-response";

export async function GET(req: NextRequest) {
  try {
    await requireAuth("products:read", req);

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;
    const isActiveParam = searchParams.get("isActive");
    const isActive = isActiveParam !== null ? isActiveParam === "true" : undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const result = await listProducts({ search, categoryId, isActive, page, limit });
    return jsonSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth("products:write", req);
    const body = await req.json();
    const validated = createProductSchema.parse(body);

    const product = await createProduct(validated, user.id);
    return jsonSuccess(product, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
