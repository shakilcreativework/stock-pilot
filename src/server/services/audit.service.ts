import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export interface ListAuditLogsParams {
  entityType?: string;
  entityId?: string;
  actorId?: string;
  action?: string;
  page?: number;
  limit?: number;
}

export async function listAuditLogs({
  entityType,
  entityId,
  actorId,
  action,
  page = 1,
  limit = 25,
}: ListAuditLogsParams = {}) {
  const skip = (page - 1) * limit;

  const where: Prisma.AuditLogWhereInput = {
    ...(entityType ? { entityType } : {}),
    ...(entityId ? { entityId } : {}),
    ...(actorId ? { actorId } : {}),
    ...(action ? { action: { contains: action, mode: "insensitive" } } : {}),
  };

  const [logs, totalCount] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actor: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}

