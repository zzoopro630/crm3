import { Hono } from "hono";
import { vi } from "vitest";
import type { Env } from "../middleware/auth";

// ---------- Supabase Mock ----------

type ChainResult = { data: unknown; error: unknown; count?: number };

interface MockQueryBuilder {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  ilike: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  _result: ChainResult;
}

export function createMockQueryBuilder(
  result: ChainResult = { data: null, error: null }
): MockQueryBuilder {
  const builder: MockQueryBuilder = {} as MockQueryBuilder;
  builder._result = result;

  const chainMethods = [
    "select",
    "insert",
    "update",
    "delete",
    "upsert",
    "eq",
    "neq",
    "in",
    "is",
    "not",
    "or",
    "ilike",
    "order",
    "range",
    "limit",
  ] as const;

  for (const method of chainMethods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }

  // terminal methods — resolve to result
  builder.single = vi.fn().mockResolvedValue(result);
  builder.maybeSingle = vi.fn().mockResolvedValue(result);

  // Make builder thenable so `await query` works
  (builder as any).then = (
    resolve: (v: ChainResult) => void,
    reject: (e: unknown) => void
  ) => Promise.resolve(result).then(resolve, reject);

  return builder;
}

export interface MockSupabase {
  from: ReturnType<typeof vi.fn>;
  auth: {
    getUser: ReturnType<typeof vi.fn>;
  };
  _builders: Map<string, MockQueryBuilder>;
}

export function mockSupabase(): MockSupabase {
  const builders = new Map<string, MockQueryBuilder>();

  const supabase: MockSupabase = {
    _builders: builders,
    from: vi.fn((table: string) => {
      if (!builders.has(table)) {
        builders.set(table, createMockQueryBuilder());
      }
      return builders.get(table)!;
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1", email: "test@example.com" } },
        error: null,
      }),
    },
  };

  return supabase;
}

/**
 * Set the result that a table's query builder will return.
 */
export function setTableResult(
  sb: MockSupabase,
  table: string,
  result: ChainResult
) {
  const builder = createMockQueryBuilder(result);
  sb._builders.set(table, builder);
  // Update from() to return the new builder
  sb.from.mockImplementation((t: string) => {
    if (!sb._builders.has(t)) {
      sb._builders.set(t, createMockQueryBuilder());
    }
    return sb._builders.get(t)!;
  });
  return builder;
}

// ---------- Test App ----------

interface TestAppOptions {
  employee?: {
    id: string;
    email: string;
    security_level: string;
    organization_id?: string;
  };
  isPublic?: boolean;
}

const DEFAULT_EMPLOYEE = {
  id: "emp-1",
  email: "admin@example.com",
  security_level: "F1",
  organization_id: "org-1",
};

/**
 * Mount a route module into a test Hono app with mocked middleware.
 * Returns { app, supabase } — make requests via app.request().
 */
export function createTestApp(
  routeModule: Hono<{ Bindings: Env }>,
  basePath: string,
  options: TestAppOptions = {}
) {
  const sb = mockSupabase();
  const emp = options.employee ?? DEFAULT_EMPLOYEE;

  const app = new Hono<{ Bindings: Env }>();

  // Inject env + supabase + auth context
  app.use("*", async (c, next) => {
    // Provide minimal env so safeError can access c.env.ENVIRONMENT
    (c as any).env = { ENVIRONMENT: "development" };
    c.set("supabase" as never, sb as never);
    if (!options.isPublic) {
      c.set("user" as never, { id: "user-1", email: emp.email } as never);
      c.set("userEmail" as never, emp.email as never);
    }
    await next();
  });

  // Mock getAuthEmployee — set employee in context for requireSecurityLevel
  app.use("*", async (c, next) => {
    if (!options.isPublic) {
      c.set("employee" as never, emp as never);
    }
    await next();
  });

  app.route(basePath, routeModule);

  return { app, supabase: sb };
}

/**
 * Shorthand: make a JSON request to a test app.
 */
export function jsonRequest(
  app: Hono<{ Bindings: Env }>,
  method: string,
  path: string,
  body?: unknown
) {
  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer test-token",
    },
  };
  if (body) init.body = JSON.stringify(body);
  return app.request(path, init);
}
