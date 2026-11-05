import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GET as listAuditLogsRoute } from "@/app/api/audit-logs/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";

describe("Audit Trail & RBAC Security Integration", () => {
  let adminCookie: string;
  let staffCookie: string;

  beforeAll(async () => {
    const admin = await prisma.user.findUnique({ where: { email: "admin@stockpilot.io" } });
    const staff = await prisma.user.findUnique({ where: { email: "staff@stockpilot.io" } });

    if (!admin || !staff) {
      throw new Error("Seed users missing.");
    }

    adminCookie = await createSession(admin.id);
    staffCookie = await createSession(staff.id);

    // Create an explicit audit log entry for testing
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "TEST_SECURITY_ACTION",
        entityType: "AuditSecurity",
        entityId: "test-sec-01",
        beforeJson: JSON.stringify({ state: "initial" }),
        afterJson: JSON.stringify({ state: "mutated" }),
      },
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({
      where: { entityType: "AuditSecurity" },
    });
    await prisma.$disconnect();
  });

  it("FR-08: allows Admin to retrieve audit logs with actor and diff details", async () => {
    const req = new NextRequest("http://localhost:3000/api/audit-logs?entityType=AuditSecurity", {
      method: "GET",
      headers: {
        Cookie: `stockpilot_session=${adminCookie}`,
      },
    });

    const res = await listAuditLogsRoute(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.logs.length).toBeGreaterThan(0);

    const targetLog = json.data.logs[0];
    expect(targetLog.action).toBe("TEST_SECURITY_ACTION");
    expect(targetLog.actor.email).toBe("admin@stockpilot.io");
    expect(JSON.parse(targetLog.beforeJson)).toEqual({ state: "initial" });
    expect(JSON.parse(targetLog.afterJson)).toEqual({ state: "mutated" });
  });

  it("FR-08: strictly forbids Staff from accessing audit logs (HTTP 403)", async () => {
    const req = new NextRequest("http://localhost:3000/api/audit-logs", {
      method: "GET",
      headers: {
        Cookie: `stockpilot_session=${staffCookie}`,
      },
    });

    const res = await listAuditLogsRoute(req);
    expect(res.status).toBe(403);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("FORBIDDEN");
  });
});

