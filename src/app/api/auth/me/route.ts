import { getSession } from "@/lib/auth/session";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/errors/api-response";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return jsonError("UNAUTHORIZED", "Not authenticated", 401);
    }

    return jsonSuccess({
      user: session.user,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

