import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/errors/api-response";

const loginSchema = z.object({
  email: z.string().email("A valid email address is required"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return jsonError("UNAUTHORIZED", "Invalid email or password", 401);
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return jsonError("UNAUTHORIZED", "Invalid email or password", 401);
    }

    await createSession(user.id);

    return jsonSuccess({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

