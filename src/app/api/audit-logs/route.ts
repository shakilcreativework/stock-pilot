import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { listAuditLogs } from "@/server/services/audit.service";
import { jsonSuccess, handleApiError } from "@/lib/errors/api-response";

export async function GET(req: NextRequest) {
  try {
    await requireAuth("audit:read", req);

    const searchParams = req.nextUrl.searchParams;
    const entityType = searchParams.get("entityType") || undefined;
    const entityId = searchParams.get("entityId") || undefined;
    const action = searchParams.get("action") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "25", 10);

    const result = await listAuditLogs({ entityType, entityId, action, page, limit });
    return jsonSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}

