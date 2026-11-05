import { Role } from "@prisma/client";

export type Permission =
  | "products:read"
  | "products:write"
  | "inventory:read"
  | "inventory:adjust"
  | "orders:read"
  | "orders:write"
  | "audit:read"
  | "team:manage";

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  [Role.ADMIN]: [
    "products:read",
    "products:write",
    "inventory:read",
    "inventory:adjust",
    "orders:read",
    "orders:write",
    "audit:read",
    "team:manage",
  ],
  [Role.STAFF]: [
    "products:read",
    "inventory:read",
    "orders:read",
    "orders:write",
  ],
} as const;

export function hasPermission(role: Role, permission: Permission): boolean {
  return (ROLE_PERMISSIONS[role] as readonly Permission[]).includes(permission);
}

export class AuthorizationError extends Error {
  public readonly statusCode = 403;
  constructor(message: string = "Forbidden: Insufficient role permissions") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class AuthenticationError extends Error {
  public readonly statusCode = 401;
  constructor(message: string = "Unauthorized: Active session required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export function assertPermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new AuthorizationError(
      `Role '${role}' is not permitted to perform action '${permission}'`
    );
  }
}

