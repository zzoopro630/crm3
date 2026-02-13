import { describe, it, expect, beforeEach } from "vitest";
import customersRoute from "../routes/customers";
import { createTestApp, jsonRequest, setTableResult } from "./helpers";
import type { MockSupabase } from "./helpers";
import type { Env } from "../middleware/auth";
import type { Hono } from "hono";

let app: Hono<{ Bindings: Env }>;
let supabase: MockSupabase;

describe("customers routes", () => {
  // ---------- GET / ----------
  describe("GET /api/customers", () => {
    beforeEach(() => {
      const ctx = createTestApp(customersRoute, "/api/customers");
      app = ctx.app;
      supabase = ctx.supabase;
    });

    it("returns paginated customer list", async () => {
      setTableResult(supabase, "customers", {
        data: [
          {
            id: "c1",
            name: "김고객",
            phone: "010-1234-5678",
            email: null,
            address: null,
            gender: null,
            birthdate: null,
            company: null,
            job_title: null,
            source: null,
            status: "new",
            type: "personal",
            interest_product: null,
            memo: null,
            admin_comment: null,
            manager_id: null,
            created_at: "2026-01-01",
            updated_at: "2026-01-01",
            deleted_at: null,
          },
        ],
        error: null,
        count: 1,
      });

      const res = await jsonRequest(app, "GET", "/api/customers");
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe("김고객");
      expect(body.data[0].jobTitle).toBeNull(); // camelCase
      expect(body.total).toBe(1);
      expect(body.page).toBe(1);
    });

    it("returns 500 on error", async () => {
      setTableResult(supabase, "customers", {
        data: null,
        error: { message: "db error" },
      });

      const res = await jsonRequest(app, "GET", "/api/customers");
      expect(res.status).toBe(500);
    });
  });

  // ---------- POST / ----------
  describe("POST /api/customers", () => {
    beforeEach(() => {
      const ctx = createTestApp(customersRoute, "/api/customers");
      app = ctx.app;
      supabase = ctx.supabase;
    });

    it("returns 400 without name", async () => {
      const res = await jsonRequest(app, "POST", "/api/customers", {
        phone: "010-0000-0000",
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("name");
    });

    it("creates customer with 201", async () => {
      setTableResult(supabase, "customers", {
        data: { id: "c-new", name: "신규" },
        error: null,
      });

      const res = await jsonRequest(app, "POST", "/api/customers", {
        name: "신규",
        phone: "010-1111-2222",
      });
      expect(res.status).toBe(201);
    });
  });

  // ---------- DELETE /:id (soft delete) ----------
  describe("DELETE /api/customers/:id", () => {
    it("F1 can soft-delete", async () => {
      const ctx = createTestApp(customersRoute, "/api/customers", {
        employee: {
          id: "emp-1",
          email: "admin@test.com",
          security_level: "F1",
        },
      });
      setTableResult(ctx.supabase, "customers", { data: null, error: null });

      const res = await jsonRequest(ctx.app, "DELETE", "/api/customers/c1");
      expect(res.status).toBe(200);
    });

    it("F5 can soft-delete", async () => {
      const ctx = createTestApp(customersRoute, "/api/customers", {
        employee: {
          id: "emp-5",
          email: "user@test.com",
          security_level: "F5",
        },
      });
      setTableResult(ctx.supabase, "customers", { data: null, error: null });

      const res = await jsonRequest(ctx.app, "DELETE", "/api/customers/c1");
      expect(res.status).toBe(200);
    });
  });

  // ---------- DELETE /:id/permanent ----------
  describe("DELETE /api/customers/:id/permanent", () => {
    it("F1 can permanently delete", async () => {
      const ctx = createTestApp(customersRoute, "/api/customers", {
        employee: {
          id: "emp-1",
          email: "admin@test.com",
          security_level: "F1",
        },
      });
      setTableResult(ctx.supabase, "customers", { data: null, error: null });

      const res = await jsonRequest(
        ctx.app,
        "DELETE",
        "/api/customers/c1/permanent"
      );
      expect(res.status).toBe(200);
    });

    it("F5 cannot permanently delete (403)", async () => {
      const ctx = createTestApp(customersRoute, "/api/customers", {
        employee: {
          id: "emp-5",
          email: "user@test.com",
          security_level: "F5",
        },
      });

      const res = await jsonRequest(
        ctx.app,
        "DELETE",
        "/api/customers/c1/permanent"
      );
      expect(res.status).toBe(403);
    });
  });
});

// ---------- sanitizeSearch / parsePagination unit tests ----------
import { sanitizeSearch, parsePagination } from "../middleware/helpers";

describe("middleware helpers", () => {

  describe("sanitizeSearch", () => {
    it("removes parentheses, dots and quotes", () => {
      expect(sanitizeSearch('name.or("evil")')).toBe("nameorevil");
    });

    it("removes commas and semicolons", () => {
      expect(sanitizeSearch("a,b;c")).toBe("abc");
    });

    it("trims whitespace", () => {
      expect(sanitizeSearch("  hello  ")).toBe("hello");
    });

    it("preserves Korean characters", () => {
      expect(sanitizeSearch("홍길동")).toBe("홍길동");
    });
  });

  describe("parsePagination", () => {
    function fakeContext(params: Record<string, string>) {
      return {
        req: {
          query: (key: string) => params[key],
        },
      };
    }

    it("returns defaults", () => {
      const result = parsePagination(fakeContext({}));
      expect(result).toEqual({ page: 1, limit: 20, offset: 0 });
    });

    it("calculates offset", () => {
      const result = parsePagination(fakeContext({ page: "3", limit: "10" }));
      expect(result).toEqual({ page: 3, limit: 10, offset: 20 });
    });

    it("caps limit at 100", () => {
      const result = parsePagination(fakeContext({ limit: "999" }));
      expect(result.limit).toBe(100);
    });

    it("handles invalid values", () => {
      const result = parsePagination(fakeContext({ page: "abc", limit: "-5" }));
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });
});
