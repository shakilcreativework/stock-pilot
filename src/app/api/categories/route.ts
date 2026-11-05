import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { jsonSuccess, handleApiError } from "@/lib/errors/api-response";

export async function GET() {
  try {
    await requireAuth("products:read");
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    return jsonSuccess(categories);
  } catch (error) {
    return handleApiError(error);
  }
}

