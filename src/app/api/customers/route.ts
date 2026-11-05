import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { createCustomerSchema } from "@/lib/validation/customer";
import { jsonSuccess, handleApiError } from "@/lib/errors/api-response";

export async function GET(req: NextRequest) {
  try {
    await requireAuth("orders:read", req);

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;

    const customers = await prisma.customer.findMany({
      where: search
        ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
        : undefined,
      include: {
        _count: {
          select: { orders: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return jsonSuccess(customers);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth("orders:write", req);
    const body = await req.json();
    const validated = createCustomerSchema.parse(body);

    const customer = await prisma.customer.create({
      data: {
        name: validated.name.trim(),
        email: validated.email ? validated.email.trim().toLowerCase() : null,
        phone: validated.phone ? validated.phone.trim() : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "CUSTOMER_CREATED",
        entityType: "Customer",
        entityId: customer.id,
        afterJson: JSON.stringify(customer),
      },
    });

    return jsonSuccess(customer, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
