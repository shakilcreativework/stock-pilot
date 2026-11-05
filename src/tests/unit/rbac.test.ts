import { describe, it, expect } from "vitest";
import { Role } from "@prisma/client";
import {
  hasPermission,
  assertPermission,
  AuthorizationError,
} from "@/lib/permissions/rbac";

describe("RBAC Permissions Guard", () => {
  it("grants Admin full operational and audit permissions", () => {
    expect(hasPermission(Role.ADMIN, "products:write")).toBe(true);
    expect(hasPermission(Role.ADMIN, "inventory:adjust")).toBe(true);
    expect(hasPermission(Role.ADMIN, "audit:read")).toBe(true);
    expect(hasPermission(Role.ADMIN, "orders:write")).toBe(true);
  });

  it("restricts Staff from administrative mutations", () => {
    expect(hasPermission(Role.STAFF, "products:write")).toBe(false);
    expect(hasPermission(Role.STAFF, "inventory:adjust")).toBe(false);
    expect(hasPermission(Role.STAFF, "audit:read")).toBe(false);
    expect(hasPermission(Role.STAFF, "team:manage")).toBe(false);
  });

  it("allows Staff to manage orders and view products/inventory", () => {
    expect(hasPermission(Role.STAFF, "orders:read")).toBe(true);
    expect(hasPermission(Role.STAFF, "orders:write")).toBe(true);
    expect(hasPermission(Role.STAFF, "products:read")).toBe(true);
    expect(hasPermission(Role.STAFF, "inventory:read")).toBe(true);
  });

  it("throws AuthorizationError with status 403 on forbidden permission check", () => {
    expect(() => assertPermission(Role.STAFF, "products:write")).toThrow(
      AuthorizationError
    );
    try {
      assertPermission(Role.STAFF, "inventory:adjust");
    } catch (err) {
      expect((err as AuthorizationError).statusCode).toBe(403);
    }
  });

  it("passes silently when permission is allowed", () => {
    expect(() => assertPermission(Role.ADMIN, "products:write")).not.toThrow();
    expect(() => assertPermission(Role.STAFF, "orders:write")).not.toThrow();
  });
});

