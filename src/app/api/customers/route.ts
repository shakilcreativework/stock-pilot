import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { jsonSuccess, handleApiError } from "@/lib/errors/api-response";

export async function GET(req: NextRequest) {
  try {
    await requireAuth("orders:read", req);
    const customers = await prisma.customer.findMany({
      orderBy: { name: "asc" },
    });
    return jsonSuccess(customers);
  } catch (error) {
    return handleApiError(error);
  }
}

