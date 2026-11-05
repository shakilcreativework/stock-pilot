import { destroySession } from "@/lib/auth/session";
import { jsonSuccess, handleApiError } from "@/lib/errors/api-response";

export async function POST() {
  try {
    await destroySession();
    return jsonSuccess({ message: "Successfully logged out" });
  } catch (error) {
    return handleApiError(error);
  }
}

