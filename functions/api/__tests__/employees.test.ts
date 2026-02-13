import { describe, it, expect, beforeEach } from "vitest";
import employeesRoute from "../routes/employees";
import { createTestApp, jsonRequest, setTableResult } from "./helpers";
import type { MockSupabase } from "./helpers";
import type { Env } from "../middleware/auth";
import type { Hono } from "hono";

let app: Hono<{ Bindings: Env }>;
let supabase: MockSupabase;

describe("employees routes", () => {
  // ---------- GET / ----------
  describe("GET /api/employees", () => {
    beforeEach(() => {
      const ctx = createTestApp(employeesRoute, "/api/employees");
      app = ctx.app;
      supabase = ctx.supabase;
    });

    it("returns mapped employee list", async () => {
      setTableResult(supabase, "employees", {
        data: [
          {
            id: "e1",
            email: "a@test.com",
            full_name: "홍길동",
            security_level: "F2",
            organization_id: "org-1",
            parent_id: null,
            position_name: "팀장",
            department: "영업",
            is_active: true,
            created_at: "2026-01-01",
            updated_at: "2026-01-01",
          },
        ],
        error: null,
      });

      const res = await jsonRequest(app, "GET", "/api/employees");
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toHaveLength(1);
      expect(body[0].fullName).toBe("홍길동");
      expect(body[0].securityLevel).toBe("F2");
      // snake_case가 아닌 camelCase인지 확인
      expect(body[0].full_name).toBeUndefined();
    });

    it("returns 500 on supabase error", async () => {
      setTableResult(supabase, "employees", {
        data: null,
        error: { message: "connection failed" },
      });

      const res = await jsonRequest(app, "GET", "/api/employees");
      expect(res.status).toBe(500);
    });
  });

  // ---------- POST / ----------
  describe("POST /api/employees", () => {
    beforeEach(() => {
      const ctx = createTestApp(employeesRoute, "/api/employees", {
        employee: {
          id: "emp-1",
          email: "admin@test.com",
          security_level: "F1",
        },
      });
      app = ctx.app;
      supabase = ctx.supabase;
    });

    it("returns 400 for missing required fields", async () => {
      const res = await jsonRequest(app, "POST", "/api/employees", {
        email: "new@test.com",
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid security level", async () => {
      const res = await jsonRequest(app, "POST", "/api/employees", {
        email: "new@test.com",
        fullName: "테스트",
        securityLevel: "X9",
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("보안 등급");
    });

    it("returns 409 for duplicate email", async () => {
      // First .from("employees") call for duplicate check returns existing
      setTableResult(supabase, "employees", {
        data: { id: "existing" },
        error: null,
      });

      const res = await jsonRequest(app, "POST", "/api/employees", {
        email: "dup@test.com",
        fullName: "중복",
        securityLevel: "F5",
      });
      expect(res.status).toBe(409);
    });
  });

  // ---------- POST / (F5 user → 403) ----------
  describe("POST /api/employees (non-F1)", () => {
    it("returns 403 for F5 user", async () => {
      const ctx = createTestApp(employeesRoute, "/api/employees", {
        employee: {
          id: "emp-5",
          email: "user@test.com",
          security_level: "F5",
        },
      });

      const res = await jsonRequest(ctx.app, "POST", "/api/employees", {
        email: "new@test.com",
        fullName: "새직원",
        securityLevel: "F5",
      });
      expect(res.status).toBe(403);
    });
  });

  // ---------- PUT /:id ----------
  describe("PUT /api/employees/:id", () => {
    it("allows self-update for non-F1 user", async () => {
      const ctx = createTestApp(employeesRoute, "/api/employees", {
        employee: {
          id: "emp-5",
          email: "user@test.com",
          security_level: "F5",
        },
      });

      setTableResult(ctx.supabase, "employees", {
        data: { id: "emp-5", full_name: "수정됨" },
        error: null,
      });

      const res = await jsonRequest(
        ctx.app,
        "PUT",
        "/api/employees/emp-5",
        { fullName: "수정됨" }
      );
      expect(res.status).toBe(200);
    });

    it("rejects non-F1 user updating another employee", async () => {
      const ctx = createTestApp(employeesRoute, "/api/employees", {
        employee: {
          id: "emp-5",
          email: "user@test.com",
          security_level: "F5",
        },
      });

      const res = await jsonRequest(
        ctx.app,
        "PUT",
        "/api/employees/emp-other",
        { fullName: "해킹" }
      );
      expect(res.status).toBe(403);
    });
  });

  // ---------- DELETE /:id ----------
  describe("DELETE /api/employees/:id", () => {
    it("returns 403 for non-F1", async () => {
      const ctx = createTestApp(employeesRoute, "/api/employees", {
        employee: {
          id: "emp-3",
          email: "user@test.com",
          security_level: "F3",
        },
      });

      const res = await jsonRequest(
        ctx.app,
        "DELETE",
        "/api/employees/emp-target"
      );
      expect(res.status).toBe(403);
    });
  });
});
