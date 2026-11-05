import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthenticationError, AuthorizationError } from "@/lib/permissions/rbac";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "INSUFFICIENT_STOCK"
  | "ORDER_CONFLICT"
  | "ALREADY_CANCELLED"
  | "INTERNAL_ERROR";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
}

export function jsonSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json<ApiResponse<T>>(
    {
      success: true,
      data,
    },
    { status }
  );
}

export function jsonError(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: unknown
) {
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
    },
    { status }
  );
}

export function handleApiError(error: unknown) {
  console.error("[API Error Handler]:", error);

  if (error instanceof ZodError) {
    return jsonError(
      "VALIDATION_ERROR",
      "Request validation failed",
      422,
      error.flatten()
    );
  }

  if (error instanceof AuthenticationError) {
    return jsonError("UNAUTHORIZED", error.message, 401);
  }

  if (error instanceof AuthorizationError) {
    return jsonError("FORBIDDEN", error.message, 403);
  }

  if (error instanceof Error) {
    return jsonError("INTERNAL_ERROR", error.message, 500);
  }

  return jsonError("INTERNAL_ERROR", "An unexpected error occurred", 500);
}

