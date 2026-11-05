import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import {
  assertPermission,
  type Permission,
  AuthenticationError,
} from "@/lib/permissions/rbac";

export const SESSION_COOKIE_NAME = "stockpilot_session";
const SESSION_DURATION_DAYS = 7;

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface ActiveSession {
  user: SessionUser;
  sessionId: string;
  expiresAt: Date;
}

/**
 * Creates a database-persisted session and sets an HttpOnly cookie.
 */
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });
  } catch {
    // In test environments where cookieStore might not be active, the token is still returned
  }

  return token;
}

/**
 * Retrieves and validates the current active session from database.
 * Supports reading from NextRequest or next/headers cookies.
 */
  export async function getSession(req?: NextRequest): Promise<ActiveSession | null> {
    let sessionToken: string | undefined;

    if (req) {
      sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    }

    if (!sessionToken) {
      try {
        const cookieStore = await cookies();
        sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
      } catch {
        // In tests without request store
      }
    }

    if (!sessionToken) {
      return null;
    }

    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        // Clean expired session
        await prisma.session.delete({ where: { id: session.id } }).catch(() => { });
      }
      return null;
    }

    return {
      user: session.user,
      sessionId: session.id,
      expiresAt: session.expiresAt,
    };
  }

  /**
   * Destroys the current session in database and clears the cookie.
   */
    export async function destroySession(req?: NextRequest): Promise<void> {
      let sessionToken: string | undefined;

      if (req) {
        sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
      }

      if (!sessionToken) {
        try {
          const cookieStore = await cookies();
          sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
          cookieStore.delete(SESSION_COOKIE_NAME);
        } catch { }
      }

      if (sessionToken) {
        await prisma.session.deleteMany({
          where: { token: sessionToken },
        });
      }
    }

    /**
     * Server guard for Route Handlers & Server Actions.
     * Enforces authentication and optional RBAC permission.
     */
      export async function requireAuth(
        permission?: Permission,
        req?: NextRequest
      ): Promise<SessionUser> {
        const session = await getSession(req);

        if (!session) {
          throw new AuthenticationError("Authentication required to access this resource");
        }

        if (permission) {
          assertPermission(session.user.role, permission);
        }

        return session.user;
      }

