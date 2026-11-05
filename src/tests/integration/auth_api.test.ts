import { describe, it, expect } from "vitest";
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { NextRequest } from "next/server";

describe("Authentication API Integration", () => {
  it("authenticates valid Admin credentials and returns user payload", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@stockpilot.io",
        password: "Admin123!",
      }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.user.email).toBe("admin@stockpilot.io");
    expect(data.data.user.role).toBe("ADMIN");
  });

  it("authenticates valid Staff credentials and returns user payload", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "staff@stockpilot.io",
        password: "Staff123!",
      }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.user.email).toBe("staff@stockpilot.io");
    expect(data.data.user.role).toBe("STAFF");
  });

  it("rejects invalid passwords with 401 UNAUTHORIZED", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@stockpilot.io",
        password: "WrongPassword123!",
      }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects invalid request formats with 422 VALIDATION_ERROR", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "not-an-email",
        password: "",
      }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(422);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });
});

