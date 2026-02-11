import { Hono } from "hono";
import { cors } from "hono/cors";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// 환경 변수 타입 정의
interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  JUSO_API_KEY: string;
  RANKTRACKER_API_URL: string;
  SUPER_ADMIN_EMAIL?: string;
  ENVIRONMENT?: string;
}

// Hono 앱 생성
const app = new Hono<{ Bindings: Env }>();

// CORS 설정
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "https://crm3.pages.dev", "https://crm.thefirst.co.kr"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Supabase 클라이언트 미들웨어
app.use("*", async (c, next) => {
  const supabase = createClient<Database>(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_SERVICE_ROLE_KEY
  );
  c.set("supabase" as never, supabase);
  await next();
});

// ============ 인증 미들웨어 ============

const PUBLIC_ROUTES: Array<{ method: string; path?: string; prefix?: string }> = [
  { method: "GET", path: "/api/health" },
  { method: "POST", path: "/api/pending-approvals" },
  { method: "GET", prefix: "/api/employees/email/" },
];

app.use("*", async (c, next) => {
  const isPublic = PUBLIC_ROUTES.some(
    (r) =>
      r.method === c.req.method &&
      (r.path ? c.req.path === r.path : r.prefix ? c.req.path.startsWith(r.prefix) : false)
  );
  if (isPublic) return await next();

  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "인증이 필요합니다." }, 401);
  }

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(authHeader.slice(7));

  if (error || !user) {
    return c.json({ error: "유효하지 않은 인증 토큰입니다." }, 401);
  }

  c.set("user" as never, user);
  c.set("userEmail" as never, user.email);
  await next();
});

// ============ 인가 헬퍼 ============

async function getAuthEmployee(c: any) {
  const cached = c.get("employee" as never);
  if (cached) return cached;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const email = c.get("userEmail" as never) as string;

  const { data } = await supabase
    .from("employees")
    .select("id, security_level, organization_id")
    .eq("email", email)
    .eq("is_active", true)
    .single();

  if (data) c.set("employee" as never, data);
  return data;
}

async function requireSecurityLevel(c: any, levels: string[]) {
  const emp = await getAuthEmployee(c);
  if (!emp)
    return c.json({ error: "사원 정보를 찾을 수 없습니다." }, 403);
  if (!levels.includes(emp.security_level))
    return c.json({ error: "권한이 부족합니다." }, 403);
  return null;
}

// 게시판 메뉴 권한 체크 (app_settings + 직원 오버라이드)
async function requireBoardEditor(c: any, categorySlug: string) {
  const emp = await getAuthEmployee(c);
  if (!emp) return c.json({ error: "사원 정보를 찾을 수 없습니다." }, 403);
  if (emp.security_level === "F1") return null;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const menuPath = `/board/${categorySlug}`;
  const level = emp.security_level;

  // 기본값: 전등급 viewer (BOARD_DEFAULT_ROLE과 동일)
  let role = "viewer";

  // app_settings 오버라이드
  const { data: setting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", `menu_role:${menuPath}`)
    .maybeSingle();

  if (setting?.value) {
    try {
      const parsed = JSON.parse(setting.value);
      if (parsed[level] !== undefined) role = parsed[level];
    } catch { /* use default */ }
  }

  // 개별 직원 오버라이드
  const { data: override } = await supabase
    .from("employee_menu_overrides")
    .select("role")
    .eq("employee_id", emp.id)
    .eq("menu_path", menuPath)
    .maybeSingle();

  if (override?.role) role = override.role;

  if (role !== "editor") {
    return c.json({ error: "권한이 부족합니다." }, 403);
  }
  return null;
}

// ============ 에러 헬퍼 ============

function safeError(c: any, error: any, status: number = 500) {
  console.error("[API Error]", error?.message || error);
  if (status >= 400 && status < 500) {
    return c.json(
      { error: error?.message || "요청 처리 실패" },
      status as any
    );
  }
  const isDev = (c.env as any).ENVIRONMENT === "development";
  return c.json(
    { error: isDev ? error.message : "서버 오류가 발생했습니다." },
    500
  );
}

// ============ 페이지네이션 헬퍼 ============

function parsePagination(c: any) {
  let page = parseInt(c.req.query("page") || "1");
  let limit = parseInt(c.req.query("limit") || "20");
  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;
  return { page, limit, offset: (page - 1) * limit };
}

// 헬스 체크 엔드포인트
app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ============ Customers API ============
app.get("/api/customers", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;

  const { page, limit, offset } = parsePagination(c);
  const search = c.req.query("search") || "";
  const status = c.req.query("status") || "";
  const managerId = c.req.query("managerId") || "";
  const type = c.req.query("type") || "";
  const sortBy = c.req.query("sortBy") || "created_at";
  const sortOrder = c.req.query("sortOrder") || "desc";

  let query = supabase.from("customers").select("*", { count: "exact" }).is("deleted_at", null);

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
  }
  if (status) {
    if (status.startsWith("!")) {
      query = query.neq("status", status.slice(1));
    } else {
      query = query.eq("status", status);
    }
  }
  if (managerId) {
    query = query.eq("manager_id", managerId);
  }
  if (type) {
    query = query.eq("type", type);
  }

  const sortColumn =
    sortBy === "createdAt"
      ? "created_at"
      : sortBy === "updatedAt"
      ? "updated_at"
      : sortBy;

  query = query.order(sortColumn, { ascending: sortOrder === "asc" });
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    return safeError(c, error);
  }

  // 담당자 ID 목록 수집
  const managerIds = [
    ...new Set((data || []).map((c) => c.manager_id).filter(Boolean)),
  ];

  let managersMap: Record<string, string> = {};
  if (managerIds.length > 0) {
    const { data: managers } = await supabase
      .from("employees")
      .select("id, full_name")
      .in("id", managerIds);

    if (managers) {
      managersMap = Object.fromEntries(
        managers.map((m) => [m.id, m.full_name])
      );
    }
  }

  // snake_case → camelCase 변환
  const customers = (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    gender: row.gender,
    birthdate: row.birthdate,
    company: row.company,
    jobTitle: row.job_title,
    source: row.source,
    status: row.status,
    type: row.type,
    interestProduct: row.interest_product,
    memo: row.memo,
    adminComment: row.admin_comment,
    managerId: row.manager_id,
    managerName: managersMap[row.manager_id] || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return c.json({
    data: customers,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
});

// 휴지통 목록 (`:id` 라우트보다 먼저 정의해야 함)
app.get("/api/customers/trash", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const { page, limit, offset } = parsePagination(c);
  const search = c.req.query("search") || "";

  let query = supabase.from("customers").select("*", { count: "exact" }).not("deleted_at", "is", null);

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  query = query.order("deleted_at", { ascending: false });
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    return safeError(c, error);
  }

  const managerIds = [...new Set((data || []).map((c) => c.manager_id).filter(Boolean))];
  let managersMap: Record<string, string> = {};
  if (managerIds.length > 0) {
    const { data: managers } = await supabase.from("employees").select("id, full_name").in("id", managerIds);
    if (managers) {
      managersMap = Object.fromEntries(managers.map((m) => [m.id, m.full_name]));
    }
  }

  const customers = (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    status: row.status,
    type: row.type,
    managerId: row.manager_id,
    managerName: managersMap[row.manager_id] || null,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
  }));

  return c.json({ data: customers, total: count || 0, page, limit, totalPages: Math.ceil((count || 0) / limit) });
});

app.get("/api/customers/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return c.json(
      { error: error.message },
      error.code === "PGRST116" ? 404 : 500
    );
  }

  // 담당자 이름 조회
  let managerName = null;
  if (data.manager_id) {
    const { data: manager } = await supabase
      .from("employees")
      .select("full_name")
      .eq("id", data.manager_id)
      .single();
    managerName = manager?.full_name || null;
  }

  return c.json({
    id: data.id,
    name: data.name,
    phone: data.phone,
    email: data.email,
    address: data.address,
    gender: data.gender,
    birthdate: data.birthdate,
    company: data.company,
    jobTitle: data.job_title,
    source: data.source,
    status: data.status,
    managerId: data.manager_id,
    managerName,
    type: data.type,
    interestProduct: data.interest_product,
    memo: data.memo,
    adminComment: data.admin_comment,
    addressDetail: data.address_detail,
    nationality: data.nationality,
    maritalStatus: data.marital_status,
    annualIncome: data.annual_income,
    existingInsurance: data.existing_insurance,
    insuranceType: data.insurance_type,
    notes: data.notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  });
});

app.post("/api/customers", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();

  if (!body.name) {
    return c.json({ error: "name은 필수입니다." }, 400);
  }

  const dbInput = {
    name: body.name,
    phone: body.phone,
    email: body.email,
    address: body.address,
    gender: body.gender,
    birthdate: body.birthdate,
    company: body.company,
    job_title: body.jobTitle,
    source: body.source,
    status: body.status || "new",
    manager_id: body.managerId,
    type: body.type || "personal",
    interest_product: body.interestProduct,
    memo: body.memo,
    admin_comment: body.adminComment,
  };

  const { data, error } = await supabase
    .from("customers")
    .insert(dbInput)
    .select("*")
    .single();

  if (error) {
    return safeError(c, error);
  }

  return c.json(data, 201);
});

app.put("/api/customers/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");
  const body = await c.req.json();

  const dbInput: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.name !== undefined) dbInput.name = body.name;
  if (body.phone !== undefined) dbInput.phone = body.phone;
  if (body.email !== undefined) dbInput.email = body.email;
  if (body.address !== undefined) dbInput.address = body.address;
  if (body.gender !== undefined) dbInput.gender = body.gender;
  if (body.birthdate !== undefined) dbInput.birthdate = body.birthdate;
  if (body.company !== undefined) dbInput.company = body.company;
  if (body.jobTitle !== undefined) dbInput.job_title = body.jobTitle;
  if (body.source !== undefined) dbInput.source = body.source;
  if (body.status !== undefined) dbInput.status = body.status;
  if (body.managerId !== undefined) dbInput.manager_id = body.managerId;
  if (body.type !== undefined) dbInput.type = body.type;
  if (body.interestProduct !== undefined)
    dbInput.interest_product = body.interestProduct;
  if (body.memo !== undefined) dbInput.memo = body.memo;
  if (body.adminComment !== undefined)
    dbInput.admin_comment = body.adminComment;
  if (body.maritalStatus !== undefined)
    dbInput.marital_status = body.maritalStatus;
  if (body.annualIncome !== undefined)
    dbInput.annual_income = body.annualIncome;
  if (body.existingInsurance !== undefined)
    dbInput.existing_insurance = body.existingInsurance;
  if (body.insuranceType !== undefined)
    dbInput.insurance_type = body.insuranceType;

  const { data, error } = await supabase
    .from("customers")
    .update(dbInput)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return safeError(c, error);
  }

  return c.json(data);
});

app.delete("/api/customers/:id", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1", "F2", "F3", "F4", "F5"]);
  if (denied) return denied;
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");

  // Soft delete
  const { error } = await supabase
    .from("customers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return safeError(c, error);
  }

  return c.json({ success: true });
});

// 완전 삭제
app.delete("/api/customers/:id/permanent", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1", "F2"]);
  if (denied) return denied;
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");

  const { error } = await supabase.from("customers").delete().eq("id", id);

  if (error) {
    return safeError(c, error);
  }

  return c.json({ success: true });
});

// 복원
app.post("/api/customers/:id/restore", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1", "F2"]);
  if (denied) return denied;
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");

  const { error } = await supabase
    .from("customers")
    .update({ deleted_at: null, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return safeError(c, error);
  }

  return c.json({ success: true });
});

// ============ Contracts API ============
app.get("/api/contracts/:customerId", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const customerId = c.req.param("customerId");

  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    return safeError(c, error);
  }

  // 작성자 이름 일괄 조회
  const creatorIds = [...new Set((data || []).map((r: any) => r.created_by).filter(Boolean))];
  const creatorsMap: Record<string, string> = {};
  if (creatorIds.length > 0) {
    const { data: creators } = await supabase
      .from("employees")
      .select("id, full_name")
      .in("id", creatorIds);
    if (creators) {
      for (const c2 of creators) creatorsMap[c2.id] = c2.full_name;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contracts = (data || []).map((row: any) => ({
    id: row.id,
    customerId: row.customer_id,
    insuranceCompany: row.insurance_company,
    productName: row.product_name,
    premium: row.premium,
    paymentPeriod: row.payment_period,
    memo: row.memo,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    authorName: creatorsMap[row.created_by] || "알 수 없음",
  }));

  return c.json(contracts);
});

app.post("/api/contracts", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();

  const { data, error } = await supabase
    .from("contracts")
    .insert({
      customer_id: body.customerId,
      insurance_company: body.insuranceCompany,
      product_name: body.productName,
      premium: body.premium,
      payment_period: body.paymentPeriod,
      memo: body.memo,
      created_by: body.createdBy,
    })
    .select()
    .single();

  if (error) {
    return safeError(c, error);
  }

  return c.json(data, 201);
});

app.put("/api/contracts/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");
  const body = await c.req.json();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.insuranceCompany !== undefined)
    updateData.insurance_company = body.insuranceCompany;
  if (body.productName !== undefined)
    updateData.product_name = body.productName;
  if (body.premium !== undefined) updateData.premium = body.premium;
  if (body.paymentPeriod !== undefined)
    updateData.payment_period = body.paymentPeriod;
  if (body.memo !== undefined) updateData.memo = body.memo;

  const { data, error } = await supabase
    .from("contracts")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return safeError(c, error);
  }

  return c.json(data);
});

app.delete("/api/contracts/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");

  const { error } = await supabase.from("contracts").delete().eq("id", id);

  if (error) {
    return safeError(c, error);
  }

  return c.json({ success: true });
});

// ============ Notes API ============
app.get("/api/notes/:customerId", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const customerId = c.req.param("customerId");

  const { data, error } = await supabase
    .from("customer_notes")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    return safeError(c, error);
  }

  // 작성자 이름 일괄 조회
  const noteCreatorIds = [...new Set((data || []).map((r: any) => r.created_by).filter(Boolean))];
  const noteCreatorsMap: Record<string, string> = {};
  if (noteCreatorIds.length > 0) {
    const { data: creators } = await supabase
      .from("employees")
      .select("id, full_name")
      .in("id", noteCreatorIds);
    if (creators) {
      for (const c2 of creators) noteCreatorsMap[c2.id] = c2.full_name;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notes = (data || []).map((row: any) => ({
    id: row.id,
    customerId: row.customer_id,
    content: row.content,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    authorName: noteCreatorsMap[row.created_by] || "알 수 없음",
  }));

  return c.json(notes);
});

app.post("/api/notes", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();

  const { data, error } = await supabase
    .from("customer_notes")
    .insert({
      customer_id: body.customerId,
      content: body.content,
      created_by: body.createdBy,
    })
    .select()
    .single();

  if (error) {
    return safeError(c, error);
  }

  return c.json(data, 201);
});

app.put("/api/notes/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");
  const body = await c.req.json();

  const { data, error } = await supabase
    .from("customer_notes")
    .update({
      content: body.content,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return safeError(c, error);
  }

  return c.json(data);
});

app.delete("/api/notes/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");

  const { error } = await supabase.from("customer_notes").delete().eq("id", id);

  if (error) {
    return safeError(c, error);
  }

  return c.json({ success: true });
});

// ============ Employees API ============
app.get("/api/employees", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;

  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) {
    return safeError(c, error);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const employees = (data || []).map((row: any) => ({
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    securityLevel: row.security_level,
    organizationId: row.organization_id,
    parentId: row.parent_id,
    positionName: row.position_name,
    department: row.department,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return c.json(employees);
});

app.get("/api/employees/email/:email", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const email = c.req.param("email");

  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("email", email)
    .single();

  if (error) {
    return c.json(
      { error: error.message },
      error.code === "PGRST116" ? 404 : 500
    );
  }

  return c.json({
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    securityLevel: data.security_level,
    organizationId: data.organization_id,
    isActive: data.is_active,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  });
});

app.post("/api/employees", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();

  const VALID_LEVELS = ["F1", "F2", "F3", "F4", "F5", "M1", "M2", "M3"];
  if (!body.email || !body.fullName || !body.securityLevel) {
    return c.json({ error: "email, fullName, securityLevel은 필수입니다." }, 400);
  }
  if (!VALID_LEVELS.includes(body.securityLevel)) {
    return c.json({ error: "유효하지 않은 보안 등급입니다." }, 400);
  }

  // 이메일 중복 체크
  const { data: existing } = await supabase
    .from("employees")
    .select("id")
    .eq("email", body.email)
    .single();

  if (existing) {
    return c.json({ error: "이미 등록된 이메일입니다." }, 409);
  }

  const { data, error } = await supabase
    .from("employees")
    .insert({
      id: body.id,
      email: body.email,
      full_name: body.fullName,
      security_level: body.securityLevel,
      organization_id: body.organizationId,
      is_active: body.isActive ?? true,
    })
    .select()
    .single();

  if (error) {
    return safeError(c, error);
  }

  return c.json(data, 201);
});

app.put("/api/employees/:id", async (c) => {
  const emp = await getAuthEmployee(c);
  if (!emp) return c.json({ error: "사원 정보를 찾을 수 없습니다." }, 403);

  const id = c.req.param("id");
  const isSelf = emp.id === id;
  const isF1 = emp.security_level === "F1";

  // F1이 아니면 자기 자신만 수정 가능
  if (!isF1 && !isSelf) {
    return c.json({ error: "권한이 부족합니다." }, 403);
  }

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();

  // 이메일 변경 시 중복 체크 (F1 전용)
  if (body.email !== undefined && isF1) {
    const { data: existing } = await supabase
      .from("employees")
      .select("id")
      .eq("email", body.email)
      .neq("id", id)
      .single();

    if (existing) {
      return c.json({ error: "이미 등록된 이메일입니다." }, 409);
    }
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  // 자기자신: 이름, 직위, 부서만 수정 가능
  if (body.fullName !== undefined) updateData.full_name = body.fullName;
  if (body.positionName !== undefined)
    updateData.position_name = body.positionName;
  if (body.department !== undefined) updateData.department = body.department;

  // F1 전용 필드
  if (isF1) {
    if (body.email !== undefined) updateData.email = body.email;
    if (body.securityLevel !== undefined)
      updateData.security_level = body.securityLevel;
    if (body.organizationId !== undefined)
      updateData.organization_id = body.organizationId;
    if (body.parentId !== undefined) updateData.parent_id = body.parentId;
    if (body.isActive !== undefined) updateData.is_active = body.isActive;
  }

  const { data, error } = await supabase
    .from("employees")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return safeError(c, error);
  }

  return c.json(data);
});

app.delete("/api/employees/:id", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");

  // Soft delete
  const { error } = await supabase
    .from("employees")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return safeError(c, error);
  }

  return c.json({ success: true });
});

app.put("/api/employees/:id/restore", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");

  const { data, error } = await supabase
    .from("employees")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return safeError(c, error);
  }

  return c.json(data);
});

// 완전 삭제 (비활성 사원만)
app.delete("/api/employees/:id/permanent", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");

  // 비활성 사원인지 확인
  const { data: employee } = await supabase
    .from("employees")
    .select("is_active, full_name")
    .eq("id", id)
    .single();

  if (employee?.is_active) {
    return c.json({ error: "활성 사원은 완전 삭제할 수 없습니다" }, 400);
  }

  // 담당 고객이 있는지 확인
  const { count: customerCount } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true })
    .eq("manager_id", id);

  if (customerCount && customerCount > 0) {
    return c.json(
      { error: `담당 고객 ${customerCount}건이 있어 삭제할 수 없습니다. 고객을 다른 담당자에게 이관 후 삭제하세요.` },
      400
    );
  }

  const { error } = await supabase.from("employees").delete().eq("id", id);

  if (error) {
    return safeError(c, error);
  }

  return c.json({ success: true });
});

// ============ Sources API ============
app.get("/api/sources", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;

  const { data, error } = await supabase
    .from("sources")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return safeError(c, error);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sources = (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  }));

  return c.json(sources);
});

app.post("/api/sources", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();

  const { data, error } = await supabase
    .from("sources")
    .insert({ name: body.name })
    .select()
    .single();

  if (error) {
    return safeError(c, error);
  }

  return c.json(
    { id: data.id, name: data.name, createdAt: data.created_at },
    201
  );
});

app.put("/api/sources/:id", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");
  const body = await c.req.json();

  const { data, error } = await supabase
    .from("sources")
    .update({ name: body.name })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return safeError(c, error);
  }

  return c.json({ id: data.id, name: data.name, createdAt: data.created_at });
});

app.delete("/api/sources/:id", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");

  const { error } = await supabase.from("sources").delete().eq("id", id);

  if (error) {
    return safeError(c, error);
  }

  return c.json({ success: true });
});

// ============ Dashboard API ============
app.get("/api/dashboard", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const managerId = c.req.query("managerId") || "";

  let query = supabase
    .from("customers")
    .select("id, status", { count: "exact" })
    .is("deleted_at", null);

  if (managerId) {
    query = query.eq("manager_id", managerId);
  }

  const { data: customers, count } = await query;

  const statusCounts = {
    new: 0,
    contacted: 0,
    consulting: 0,
    closed: 0,
  };

  if (customers) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    customers.forEach((customer: any) => {
      const status = customer.status as keyof typeof statusCounts;
      if (status in statusCounts) {
        statusCounts[status]++;
      }
    });
  }

  // 최근 등록된 고객 5명
  let recentQuery = supabase
    .from("customers")
    .select("id, name, status, created_at, manager_id")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(5);

  if (managerId) {
    recentQuery = recentQuery.eq("manager_id", managerId);
  }

  const { data: recentData } = await recentQuery;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const managerIds = [
    ...new Set(
      (recentData || []).map((c: any) => c.manager_id).filter(Boolean)
    ),
  ];
  let managersMap: Record<string, string> = {};

  if (managerIds.length > 0) {
    const { data: managers } = await supabase
      .from("employees")
      .select("id, full_name")
      .in("id", managerIds);

    if (managers) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      managersMap = Object.fromEntries(
        managers.map((m: any) => [m.id, m.full_name])
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentCustomers = (recentData || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    createdAt: row.created_at,
    managerName: managersMap[row.manager_id] || null,
  }));

  return c.json({
    totalCustomers: count || 0,
    newCustomers: statusCounts.new,
    contactedCustomers: statusCounts.contacted,
    consultingCustomers: statusCounts.consulting,
    closedCustomers: statusCounts.closed,
    recentCustomers,
  });
});

// ============ Pending Approvals API ============
app.get("/api/pending-approvals", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;

  const { data, error } = await supabase
    .from("pending_approvals")
    .select("*")
    .eq("status", "pending")
    .order("requested_at", { ascending: true });

  if (error) {
    return safeError(c, error);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const approvals = (data || []).map((row: any) => ({
    id: row.id,
    email: row.email,
    status: row.status,
    requestedAt: row.requested_at,
    processedBy: row.processed_by,
    processedAt: row.processed_at,
  }));

  return c.json(approvals);
});

app.post("/api/pending-approvals", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();

  // Check if already exists
  const { data: existing } = await supabase
    .from("pending_approvals")
    .select("*")
    .eq("email", body.email)
    .eq("status", "pending")
    .single();

  if (existing) {
    return c.json(existing);
  }

  // [New] 최고관리자 자동 승인 처리
  const superAdminEmail = (c.env as Record<string, string>).SUPER_ADMIN_EMAIL;
  if (superAdminEmail && body.email === superAdminEmail) {
    // Check if already in employees
    const { data: existingEmp } = await supabase
      .from("employees")
      .select("*")
      .eq("email", body.email)
      .single();

    if (existingEmp) {
      return c.json(existingEmp);
    }

    // Create as F1 directly
    const { data: admin, error: adminError } = await supabase
      .from("employees")
      .insert({
        email: body.email,
        full_name: "최고관리자",
        security_level: "F1",
        // default values will be applied (isActive: true)
      })
      .select()
      .single();

    if (adminError) {
      return c.json({ error: adminError.message }, 500);
    }
    return c.json(admin, 201);
  }

  const { data, error } = await supabase
    .from("pending_approvals")
    .insert({ email: body.email })
    .select()
    .single();

  if (error) {
    return safeError(c, error);
  }

  return c.json(data, 201);
});

app.put("/api/pending-approvals/:id/approve", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");
  const body = await c.req.json();

  const VALID_LEVELS = ["F1", "F2", "F3", "F4", "F5", "M1", "M2", "M3"];
  if (!body.email || !body.fullName || !body.securityLevel) {
    return c.json({ error: "email, fullName, securityLevel은 필수입니다." }, 400);
  }
  if (!VALID_LEVELS.includes(body.securityLevel)) {
    return c.json({ error: "유효하지 않은 보안 등급입니다." }, 400);
  }

  // 이메일 중복 체크
  const { data: existing } = await supabase
    .from("employees")
    .select("id")
    .eq("email", body.email)
    .single();

  if (existing) {
    // 이미 등록된 이메일이면 pending_approvals status만 업데이트하고 목록에서 제거
    const { error: updateError } = await supabase
      .from("pending_approvals")
      .update({
        status: "approved",
        processed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Failed to update pending_approvals:", updateError);
    }

    return c.json({ error: "이미 등록된 이메일입니다. 대기 목록에서 제거됩니다." }, 409);
  }

  // Create employee first
  const { data: employee, error: empError } = await supabase
    .from("employees")
    .insert({
      id: body.employeeId,
      email: body.email,
      full_name: body.fullName,
      security_level: body.securityLevel,
      organization_id: body.organizationId,
      parent_id: body.parentId || null,
      position_name: body.positionName || null,
    })
    .select()
    .single();

  if (empError) {
    return c.json({ error: empError.message }, 500);
  }

  // Update approval status
  await supabase
    .from("pending_approvals")
    .update({
      status: "approved",
      processed_by: body.approvedBy,
      processed_at: new Date().toISOString(),
    })
    .eq("id", id);

  return c.json(employee);
});

app.put("/api/pending-approvals/:id/reject", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");
  const body = await c.req.json();

  const { error } = await supabase
    .from("pending_approvals")
    .update({
      status: "rejected",
      processed_by: body.rejectedBy,
      processed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return safeError(c, error);
  }

  return c.json({ success: true });
});

// ============ Organizations API ============
app.get("/api/organizations", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return safeError(c, error);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const managerIds = [
    ...new Set((data || []).map((o: any) => o.manager_id).filter(Boolean)),
  ];
  let managersMap: Record<string, string> = {};

  if (managerIds.length > 0) {
    const { data: managers } = await supabase
      .from("employees")
      .select("id, full_name")
      .in("id", managerIds);

    if (managers) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      managersMap = Object.fromEntries(
        managers.map((m: any) => [m.id, m.full_name])
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const organizations = (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    managerId: row.manager_id,
    managerName: row.manager_id ? managersMap[row.manager_id] || null : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return c.json(organizations);
});

app.get("/api/organizations/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return c.json(
      { error: error.message },
      error.code === "PGRST116" ? 404 : 500
    );
  }

  let managerName = null;
  if (data.manager_id) {
    const { data: manager } = await supabase
      .from("employees")
      .select("full_name")
      .eq("id", data.manager_id)
      .single();
    managerName = manager?.full_name || null;
  }

  return c.json({
    id: data.id,
    name: data.name,
    parentId: data.parent_id,
    managerId: data.manager_id,
    managerName,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  });
});

app.post("/api/organizations", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();

  const { data, error } = await supabase
    .from("organizations")
    .insert({
      name: body.name,
      parent_id: body.parentId || null,
      manager_id: body.managerId || null,
    })
    .select()
    .single();

  if (error) {
    return safeError(c, error);
  }

  return c.json(data, 201);
});

app.put("/api/organizations/:id", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");
  const body = await c.req.json();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.name !== undefined) updateData.name = body.name;
  if (body.parentId !== undefined) updateData.parent_id = body.parentId;
  if (body.managerId !== undefined) updateData.manager_id = body.managerId;

  const { data, error } = await supabase
    .from("organizations")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return safeError(c, error);
  }

  return c.json(data);
});

app.delete("/api/organizations/:id", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");

  const { error } = await supabase.from("organizations").delete().eq("id", id);

  if (error) {
    return safeError(c, error);
  }

  return c.json({ success: true });
});

// ============ Team API ============
app.post("/api/team/members", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();
  const { employeeId, securityLevel } = body;

  let employeeIds: string[] = [employeeId];

  if (securityLevel === "F1") {
    const { data: allEmployees, error } = await supabase
      .from("employees")
      .select("id")
      .eq("is_active", true);

    if (error) {
      return safeError(c, error);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    employeeIds = (allEmployees || []).map((e: any) => e.id);
  }

  // 각 사원의 고객 통계 조회
  const teamMembers = [];
  for (const empId of employeeIds) {
    const { data: emp } = await supabase
      .from("employees")
      .select("*")
      .eq("id", empId)
      .single();

    if (!emp) continue;

    const { data: customers } = await supabase
      .from("customers")
      .select("status")
      .eq("manager_id", empId)
      .is("deleted_at", null);

    const customersByStatus = {
      new: 0,
      contacted: 0,
      consulting: 0,
      closed: 0,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (customers || []).forEach((c: any) => {
      const status = c.status as keyof typeof customersByStatus;
      if (status in customersByStatus) {
        customersByStatus[status]++;
      }
    });

    teamMembers.push({
      id: emp.id,
      email: emp.email,
      fullName: emp.full_name,
      securityLevel: emp.security_level,
      organizationId: emp.organization_id,
      isActive: emp.is_active,
      customerCount: customers?.length || 0,
      customersByStatus,
    });
  }

  return c.json(teamMembers);
});

app.post("/api/team/stats", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();
  const { memberIds } = body;

  const { data: customers, error } = await supabase
    .from("customers")
    .select("status")
    .in("manager_id", memberIds)
    .is("deleted_at", null);

  if (error) {
    return safeError(c, error);
  }

  const byStatus = { new: 0, contacted: 0, consulting: 0, closed: 0 };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (customers || []).forEach((c: any) => {
    const status = c.status as keyof typeof byStatus;
    if (status in byStatus) {
      byStatus[status]++;
    }
  });

  return c.json({
    totalCustomers: customers?.length || 0,
    byStatus,
  });
});

app.put("/api/customers/:id/transfer", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");
  const body = await c.req.json();

  const { error } = await supabase
    .from("customers")
    .update({
      manager_id: body.newManagerId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return safeError(c, error);
  }

  return c.json({ success: true });
});

// ============ Inquiries API (marketing.inquiries) ============

app.get("/api/inquiries", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;

  const { page, limit, offset } = parsePagination(c);
  const search = c.req.query("search") || "";
  const status = c.req.query("status") || "";
  const managerId = c.req.query("managerId") || "";

  let query = (supabase as any)
    .schema("marketing")
    .from("inquiries")
    .select("*", { count: "exact" })
    .not("source_url", "ilike", "%contact-forms/456%")
    .not("utm_campaign", "ilike", "%recruit%");

  if (search) {
    query = query.or(`customer_name.ilike.%${search}%,phone.ilike.%${search}%`);
  }
  if (status) {
    if (status.startsWith("!")) {
      query = query.neq("status", status.slice(1));
    } else {
      query = query.eq("status", status);
    }
  }
  if (managerId) {
    query = query.eq("manager_id", managerId);
  }

  query = query.order("created_at", { ascending: false });
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    return safeError(c, error);
  }

  // 담당자 이름 조회
  const managerIds = [
    ...new Set((data || []).map((r: any) => r.manager_id).filter(Boolean)),
  ];
  let managersMap: Record<string, string> = {};
  if (managerIds.length > 0) {
    const { data: managers } = await supabase
      .from("employees")
      .select("id, full_name")
      .in("id", managerIds);
    if (managers) {
      managersMap = Object.fromEntries(
        managers.map((m: any) => [m.id, m.full_name])
      );
    }
  }

  const inquiries = (data || []).map((row: any) => ({
    id: row.id,
    customerName: row.customer_name,
    phone: row.phone,
    productName: row.product_name,
    utmCampaign: row.utm_campaign,
    sourceUrl: row.source_url,
    inquiryDate: row.inquiry_date,
    managerId: row.manager_id,
    managerName: row.manager_id ? managersMap[row.manager_id] || null : null,
    status: row.status || "new",
    email: row.email,
    memo: row.memo,
    adminComment: row.admin_comment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return c.json({
    data: inquiries,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
});

app.put("/api/inquiries/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");
  const body = await c.req.json();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.managerId !== undefined) updateData.manager_id = body.managerId;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.memo !== undefined) updateData.memo = body.memo;
  if (body.email !== undefined) updateData.email = body.email;
  if (body.adminComment !== undefined) updateData.admin_comment = body.adminComment;

  const { data, error } = await (supabase as any)
    .schema("marketing")
    .from("inquiries")
    .update(updateData)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return safeError(c, error);
  }

  return c.json({
    id: data.id,
    customerName: data.customer_name,
    phone: data.phone,
    productName: data.product_name,
    utmCampaign: data.utm_campaign,
    sourceUrl: data.source_url,
    inquiryDate: data.inquiry_date,
    managerId: data.manager_id,
    status: data.status || "new",
    email: data.email,
    memo: data.memo,
    adminComment: data.admin_comment,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  });
});

app.post("/api/inquiries", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();

  const insertData: Record<string, unknown> = {
    customer_name: body.customerName,
    phone: body.phone,
    product_name: body.productName || null,
    status: body.status || "new",
    manager_id: body.managerId || null,
    memo: body.memo || null,
    inquiry_date: new Date().toISOString(),
  };

  const { data, error } = await (supabase as any)
    .schema("marketing")
    .from("inquiries")
    .insert(insertData)
    .select("*")
    .single();

  if (error) {
    return safeError(c, error);
  }

  return c.json({
    id: data.id,
    customerName: data.customer_name,
    phone: data.phone,
    productName: data.product_name,
    managerId: data.manager_id,
    status: data.status || "new",
    memo: data.memo,
    inquiryDate: data.inquiry_date,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }, 201);
});

// ============ Consultant Inquiries API (marketing.consultant_inquiries) ============

app.get("/api/consultant-inquiries", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;

  const { page, limit, offset } = parsePagination(c);
  const search = c.req.query("search") || "";
  const status = c.req.query("status") || "";
  const managerId = c.req.query("managerId") || "";

  let query = (supabase as any)
    .schema("marketing")
    .from("consultant_inquiries")
    .select("*", { count: "exact" });

  if (search) {
    query = query.or(`customer_name.ilike.%${search}%,phone.ilike.%${search}%`);
  }
  if (status) {
    if (status.startsWith("!")) {
      query = query.neq("status", status.slice(1));
    } else {
      query = query.eq("status", status);
    }
  }
  if (managerId) {
    query = query.eq("manager_id", managerId);
  }

  query = query.order("created_at", { ascending: false });
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    return safeError(c, error);
  }

  const managerIds = [
    ...new Set((data || []).map((r: any) => r.manager_id).filter(Boolean)),
  ];
  let managersMap: Record<string, string> = {};
  if (managerIds.length > 0) {
    const { data: managers } = await supabase
      .from("employees")
      .select("id, full_name")
      .in("id", managerIds);
    if (managers) {
      managersMap = Object.fromEntries(
        managers.map((m: any) => [m.id, m.full_name])
      );
    }
  }

  const inquiries = (data || []).map((row: any) => ({
    id: row.id,
    customerName: row.customer_name,
    phone: row.phone,
    productName: row.product_name,
    consultant: row.consultant,
    tfRef: row.tf_ref,
    refererPage: row.referer_page,
    request: row.request,
    sourceUrl: row.source_url,
    inquiryDate: row.inquiry_date,
    managerId: row.manager_id,
    managerName: row.manager_id ? managersMap[row.manager_id] || null : null,
    status: row.status || "new",
    memo: row.memo,
    adminComment: row.admin_comment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return c.json({
    data: inquiries,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
});

app.put("/api/consultant-inquiries/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");
  const body = await c.req.json();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.managerId !== undefined) updateData.manager_id = body.managerId;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.memo !== undefined) updateData.memo = body.memo;
  if (body.adminComment !== undefined) updateData.admin_comment = body.adminComment;

  const { data, error } = await (supabase as any)
    .schema("marketing")
    .from("consultant_inquiries")
    .update(updateData)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return safeError(c, error);
  }

  return c.json({
    id: data.id,
    customerName: data.customer_name,
    phone: data.phone,
    productName: data.product_name,
    consultant: data.consultant,
    tfRef: data.tf_ref,
    refererPage: data.referer_page,
    request: data.request,
    sourceUrl: data.source_url,
    inquiryDate: data.inquiry_date,
    managerId: data.manager_id,
    status: data.status || "new",
    memo: data.memo,
    adminComment: data.admin_comment,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  });
});

// ============ Recruit Inquiries API (marketing.inquiries WHERE utm_campaign LIKE '%recruit%') ============

app.get("/api/recruit-inquiries", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;

  const { page, limit, offset } = parsePagination(c);
  const search = c.req.query("search") || "";
  const status = c.req.query("status") || "";
  const managerId = c.req.query("managerId") || "";

  let query = (supabase as any)
    .schema("marketing")
    .from("recruit_inquiries")
    .select("*", { count: "exact" });

  if (search) {
    query = query.or(`customer_name.ilike.%${search}%,phone.ilike.%${search}%`);
  }
  if (status) {
    if (status.startsWith("!")) {
      query = query.neq("status", status.slice(1));
    } else {
      query = query.eq("status", status);
    }
  }
  if (managerId) {
    query = query.eq("manager_id", managerId);
  }

  query = query.order("inquiry_date", { ascending: false, nullsFirst: false });
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    return safeError(c, error);
  }

  const managerIds = [
    ...new Set((data || []).map((r: any) => r.manager_id).filter(Boolean)),
  ];
  let managersMap: Record<string, string> = {};
  if (managerIds.length > 0) {
    const { data: managers } = await supabase
      .from("employees")
      .select("id, full_name")
      .in("id", managerIds);
    if (managers) {
      managersMap = Object.fromEntries(
        managers.map((m: any) => [m.id, m.full_name])
      );
    }
  }

  const inquiries = (data || []).map((row: any) => ({
    id: row.id,
    customerName: row.customer_name,
    phone: row.phone,
    age: row.age,
    area: row.area,
    career: row.career,
    request: row.request,
    utmCampaign: row.utm_campaign,
    sourceUrl: row.source_url,
    refererPage: row.referer_page,
    inquiryDate: row.inquiry_date,
    managerId: row.manager_id,
    managerName: row.manager_id ? managersMap[row.manager_id] || null : null,
    status: row.status || "new",
    memo: row.memo,
    adminComment: row.admin_comment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return c.json({
    data: inquiries,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
});

app.put("/api/recruit-inquiries/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");
  const body = await c.req.json();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.managerId !== undefined) updateData.manager_id = body.managerId;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.memo !== undefined) updateData.memo = body.memo;
  if (body.adminComment !== undefined) updateData.admin_comment = body.adminComment;

  const { data, error } = await (supabase as any)
    .schema("marketing")
    .from("recruit_inquiries")
    .update(updateData)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return safeError(c, error);
  }

  return c.json({
    id: data.id,
    customerName: data.customer_name,
    phone: data.phone,
    age: data.age,
    area: data.area,
    career: data.career,
    request: data.request,
    utmCampaign: data.utm_campaign,
    sourceUrl: data.source_url,
    refererPage: data.referer_page,
    inquiryDate: data.inquiry_date,
    managerId: data.manager_id,
    status: data.status || "new",
    memo: data.memo,
    adminComment: data.admin_comment,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  });
});

// ============ Ads API (marketing schema) ============

// 키워드 상세 데이터 조회
app.get("/api/ads/keyword-details", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const startDate = c.req.query("startDate") || "";
  const endDate = c.req.query("endDate") || "";

  let query = (supabase as any)
    .schema("marketing")
    .from("keyword_details")
    .select("*")
    .order("report_date", { ascending: false })
    .order("total_cost", { ascending: false });

  if (startDate && endDate) {
    query = query.gte("report_date", startDate).lte("report_date", endDate);
  }

  const { data, error } = await query;
  if (error) return safeError(c, error);

  const formattedData = (data || []).map((item: any) => ({
    id: item.id,
    adGroup: item.ad_group,
    keyword: item.keyword,
    reportDate: item.report_date,
    impressions: item.impressions,
    clicks: item.clicks,
    clickRate: item.click_rate,
    avgCpc: item.avg_cpc,
    totalCost: item.total_cost,
    avgPosition: item.avg_position,
    createdAt: item.created_at,
  }));

  return c.json({ success: true, data: formattedData });
});

// CSV 데이터 저장 (upsert)
app.post("/api/ads/keyword-details", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();

  const dbData = body.map((item: any) => ({
    ad_group: item.adGroup,
    keyword: item.keyword,
    report_date: item.reportDate,
    impressions: item.impressions,
    clicks: item.clicks,
    click_rate: item.clickRate,
    avg_cpc: item.avgCpc,
    total_cost: item.totalCost,
    avg_position: item.avgPosition,
  }));

  const { error } = await (supabase as any)
    .schema("marketing")
    .from("keyword_details")
    .upsert(dbData, { onConflict: "ad_group,keyword,report_date", ignoreDuplicates: false });

  if (error) return safeError(c, error);
  return c.json({ success: true, count: body.length });
});

// 키워드 상세 데이터 삭제 (날짜 범위)
app.delete("/api/ads/keyword-details", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  if (!startDate || !endDate) {
    return c.json({ error: "startDate and endDate are required" }, 400);
  }

  const { data, error } = await (supabase as any)
    .schema("marketing")
    .from("keyword_details")
    .delete()
    .gte("report_date", startDate)
    .lte("report_date", endDate)
    .select("id");

  if (error) return safeError(c, error);
  return c.json({ success: true, deletedCount: data?.length || 0 });
});

// 문의 목록 조회
app.get("/api/ads/inquiries", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const startDate = c.req.query("startDate") || "";
  const endDate = c.req.query("endDate") || "";

  let query = (supabase as any)
    .schema("marketing")
    .from("inquiries")
    .select("*")
    .eq("utm_campaign", "powerContents")
    .order("inquiry_date", { ascending: false });

  if (startDate && endDate) {
    const kstStart = `${startDate}T00:00:00+09:00`;
    const kstEnd = `${endDate}T23:59:59+09:00`;
    query = query.gte("inquiry_date", kstStart).lte("inquiry_date", kstEnd);
  }

  const { data, error } = await query;
  if (error) return safeError(c, error);

  const formattedData = (data || []).map((item: any) => ({
    id: item.id,
    customerName: item.customer_name,
    phone: item.phone,
    productName: item.product_name,
    utmCampaign: item.utm_campaign,
    sourceUrl: item.source_url,
    inquiryDate: item.inquiry_date,
    createdAt: item.created_at,
  }));

  return c.json({ success: true, data: formattedData });
});

// 수동 문의 입력
app.post("/api/ads/inquiries", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();

  // 허용 필드만 pick
  const rows = (Array.isArray(body) ? body : [body]).map((item: any) => ({
    customer_name: item.customer_name,
    phone: item.phone,
    product_name: item.product_name,
    utm_campaign: item.utm_campaign,
    source_url: item.source_url,
    inquiry_date: item.inquiry_date,
  }));

  const { error } = await (supabase as any)
    .schema("marketing")
    .from("inquiries")
    .insert(rows);

  if (error) return safeError(c, error);
  return c.json({ success: true });
});

// GA 요약 데이터 조회 (DB 캐시)
app.get("/api/ads/ga-summary", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const startDate = c.req.query("startDate") || "";
  const endDate = c.req.query("endDate") || "";

  const { data, error } = await (supabase as any)
    .schema("marketing")
    .from("ga_summary")
    .select("*")
    .gte("report_date", startDate)
    .lte("report_date", endDate);

  if (error) return safeError(c, error);

  if (!data || data.length === 0) {
    return c.json({ success: true, data: [], fromDb: false });
  }

  // 키워드별로 집계 (여러 날짜 합산)
  const aggregated: Record<string, any> = {};
  for (const item of data) {
    const key = item.insurance_name;
    if (!aggregated[key]) {
      aggregated[key] = { insuranceName: key, sessions: 0, keyEvents: 0, activeUsers: 0, landingDbRate: 0 };
    }
    aggregated[key].sessions += item.sessions;
    aggregated[key].keyEvents += item.key_events;
    aggregated[key].activeUsers += item.active_users;
  }

  const formattedData = Object.values(aggregated).map((item: any) => ({
    ...item,
    landingDbRate: item.sessions > 0 ? Math.round((item.keyEvents / item.sessions) * 10000) / 100 : 0,
  }));

  return c.json({ success: true, data: formattedData, fromDb: true });
});

// GA 요약 데이터 저장
app.post("/api/ads/ga-summary", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const { data: bodyData, reportDate } = await c.req.json();

  if (!bodyData || bodyData.length === 0) {
    return c.json({ success: true, count: 0 });
  }

  const validData = bodyData.filter((item: any) => item.insuranceName && item.insuranceName.trim() !== "");
  if (validData.length === 0) return c.json({ success: true, count: 0 });

  const dbData = validData.map((item: any) => ({
    insurance_name: item.insuranceName.trim(),
    sessions: item.sessions || 0,
    key_events: item.keyEvents || 0,
    active_users: item.activeUsers || 0,
    landing_db_rate: item.landingDbRate || 0,
    report_date: reportDate,
  }));

  const { error } = await (supabase as any)
    .schema("marketing")
    .from("ga_summary")
    .upsert(dbData, { onConflict: "insurance_name,report_date", ignoreDuplicates: false });

  if (error) return safeError(c, error);
  return c.json({ success: true, count: bodyData.length });
});

// GA 전체 세션 데이터 조회 (DB 캐시)
app.get("/api/ads/ga-totals", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const startDate = c.req.query("startDate") || "";
  const endDate = c.req.query("endDate") || "";

  const { data, error } = await (supabase as any)
    .schema("marketing")
    .from("ga_totals")
    .select("*")
    .gte("report_date", startDate)
    .lte("report_date", endDate);

  if (error) return safeError(c, error);

  if (!data || data.length === 0) {
    return c.json({ success: true, totals: null, fromDb: false });
  }

  const totals = data.reduce(
    (acc: any, item: any) => ({
      sessions: acc.sessions + item.sessions,
      conversions: acc.conversions + item.conversions,
      activeUsers: acc.activeUsers + item.active_users,
    }),
    { sessions: 0, conversions: 0, activeUsers: 0 },
  );

  return c.json({ success: true, totals, fromDb: true });
});

// GA 전체 세션 데이터 저장
app.post("/api/ads/ga-totals", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const { totals, reportDate } = await c.req.json();

  if (!totals || (totals.sessions === 0 && totals.conversions === 0)) {
    return c.json({ success: true });
  }

  const dbData = {
    sessions: totals.sessions,
    conversions: totals.conversions,
    active_users: totals.activeUsers,
    report_date: reportDate,
  };

  const { error } = await (supabase as any)
    .schema("marketing")
    .from("ga_totals")
    .upsert(dbData, { onConflict: "report_date", ignoreDuplicates: false });

  if (error) return safeError(c, error);
  return c.json({ success: true });
});

// GA Edge Function 프록시: Summary
app.post("/api/ads/ga/edge-summary", async (c) => {
  try {
    const body = await c.req.json();
    const fnUrl = `${c.env.SUPABASE_URL}/functions/v1/google-analytics/summary`;

    const res = await fetch(fnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: c.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${c.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[GA Edge] summary error:", res.status, errText);
      return c.json({ success: false, count: 0, data: [] });
    }

    const data = await res.json();
    return c.json(data as Record<string, unknown>);
  } catch (err: unknown) {
    console.error("[GA Edge] summary exception:", (err as Error).message);
    return c.json({ success: false, count: 0, data: [] });
  }
});

// GA Edge Function 프록시: Total Sessions
app.post("/api/ads/ga/edge-total-sessions", async (c) => {
  try {
    const body = await c.req.json();
    const fnUrl = `${c.env.SUPABASE_URL}/functions/v1/google-analytics/total-sessions`;

    const res = await fetch(fnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: c.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${c.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[GA Edge] total-sessions error:", res.status, errText);
      return c.json({ success: false, totals: null });
    }

    const data = await res.json();
    return c.json(data as Record<string, unknown>);
  } catch (err: unknown) {
    console.error("[GA Edge] total-sessions exception:", (err as Error).message);
    return c.json({ success: false, totals: null });
  }
});

// ============ Settings API ============
app.get("/api/settings", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;

  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value");

  if (error) return safeError(c, error);

  return c.json(
    (data || []).map((row: any) => ({ key: row.key, value: row.value }))
  );
});

app.put("/api/settings", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();
  const items = body.items as Array<{ key: string; value: string | null }>;
  const now = new Date().toISOString();

  // value가 있는 항목: upsert (1 request)
  const toUpsert = items
    .filter((i) => i.value)
    .map((i) => ({ key: i.key, value: i.value!, updated_at: now }));

  // value가 null인 항목: delete (1 request)
  const toDeleteKeys = items.filter((i) => !i.value).map((i) => i.key);

  const errors: string[] = [];

  if (toUpsert.length > 0) {
    const { error } = await supabase
      .from("app_settings")
      .upsert(toUpsert, { onConflict: "key" });
    if (error) errors.push(`upsert: ${error.message}`);
  }

  if (toDeleteKeys.length > 0) {
    const { error } = await supabase
      .from("app_settings")
      .delete()
      .in("key", toDeleteKeys);
    if (error) errors.push(`delete: ${error.message}`);
  }

  if (errors.length > 0) {
    return c.json({ error: errors.join("; ") }, 500);
  }
  return c.json({ success: true });
});

// ============ Address Search Proxy API ============
app.get("/api/address/search", async (c) => {
  const keyword = c.req.query("keyword") || "";
  const currentPage = c.req.query("currentPage") || "1";
  const countPerPage = c.req.query("countPerPage") || "10";

  if (!keyword) {
    return c.json({ error: "keyword is required" }, 400);
  }

  const apiKey = c.env.JUSO_API_KEY;
  if (!apiKey) {
    return c.json({ error: "JUSO_API_KEY not configured" }, 500);
  }

  const url = `https://business.juso.go.kr/addrlink/addrLinkApi.do?confmKey=${encodeURIComponent(
    apiKey
  )}&currentPage=${currentPage}&countPerPage=${countPerPage}&keyword=${encodeURIComponent(
    keyword
  )}&resultType=json`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return c.json(data);
  } catch (error) {
    console.error("Address API error:", error);
    return c.json({ error: "Failed to fetch address" }, 500);
  }
});

// ============ Contacts API ============

// GET /api/contacts - 활성 연락처 목록
app.get("/api/contacts", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;

  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) return safeError(c, error);

  const contacts = (data || []).map((row: Record<string, unknown>) => ({
    id: row.id,
    name: row.name,
    title: row.title,
    team: row.team,
    phone: row.phone,
    managerId: row.manager_id,
    employeeId: row.employee_id,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  }));

  return c.json(contacts);
});

// POST /api/contacts - 연락처 추가
app.post("/api/contacts", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      name: body.name,
      title: body.title || null,
      team: body.team || "미지정",
      phone: body.phone,
      manager_id: body.managerId || null,
      employee_id: body.employeeId || null,
    })
    .select()
    .single();

  if (error) return safeError(c, error);

  return c.json({
    id: data.id,
    name: data.name,
    title: data.title,
    team: data.team,
    phone: data.phone,
    managerId: data.manager_id,
    employeeId: data.employee_id,
    createdAt: data.created_at,
    deletedAt: data.deleted_at,
  }, 201);
});

// PUT /api/contacts/:id - 연락처 수정
app.put("/api/contacts/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");
  const body = await c.req.json();

  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.title !== undefined) updateData.title = body.title;
  if (body.team !== undefined) updateData.team = body.team;
  if (body.phone !== undefined) updateData.phone = body.phone;
  if (body.managerId !== undefined) updateData.manager_id = body.managerId;
  if (body.employeeId !== undefined) updateData.employee_id = body.employeeId;

  const { data, error } = await supabase
    .from("contacts")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) return safeError(c, error);

  return c.json({
    id: data.id,
    name: data.name,
    title: data.title,
    team: data.team,
    phone: data.phone,
    managerId: data.manager_id,
    employeeId: data.employee_id,
    createdAt: data.created_at,
    deletedAt: data.deleted_at,
  });
});

// DELETE /api/contacts/:id - 소프트 삭제
app.delete("/api/contacts/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");

  const { error } = await supabase
    .from("contacts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return safeError(c, error);
  return c.json({ success: true });
});

// GET /api/contacts/trash - 휴지통 목록
app.get("/api/contacts/trash", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;

  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (error) return safeError(c, error);

  const contacts = (data || []).map((row: Record<string, unknown>) => ({
    id: row.id,
    name: row.name,
    title: row.title,
    team: row.team,
    phone: row.phone,
    managerId: row.manager_id,
    employeeId: row.employee_id,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  }));

  return c.json(contacts);
});

// POST /api/contacts/:id/restore - 복원
app.post("/api/contacts/:id/restore", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");

  const { error } = await supabase
    .from("contacts")
    .update({ deleted_at: null })
    .eq("id", id);

  if (error) return safeError(c, error);
  return c.json({ success: true });
});

// DELETE /api/contacts/:id/permanent - 완전 삭제
app.delete("/api/contacts/:id/permanent", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");

  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", id);

  if (error) return safeError(c, error);
  return c.json({ success: true });
});

// DELETE /api/contacts/trash/empty - 휴지통 비우기
app.delete("/api/contacts/trash/empty", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;

  const { error } = await supabase
    .from("contacts")
    .delete()
    .not("deleted_at", "is", null);

  if (error) return safeError(c, error);
  return c.json({ success: true });
});

// POST /api/contacts/bulk - Excel 일괄 등록 (2-pass)
app.post("/api/contacts/bulk", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();
  const { contacts, managerNames } = body as {
    contacts: Array<{
      name: string;
      title?: string | null;
      team?: string;
      phone: string;
    }>;
    managerNames: Record<string, string>; // index -> manager name
  };

  // Pass 1: Insert all contacts without manager_id
  const insertData = contacts.map((c) => ({
    name: c.name,
    title: c.title || null,
    team: c.team || "미지정",
    phone: c.phone,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("contacts")
    .insert(insertData)
    .select();

  if (insertError) return c.json({ error: insertError.message }, 500);
  if (!inserted) return c.json({ error: "Insert failed" }, 500);

  // Pass 2: Resolve manager names and update manager_id
  // Build name → id map from ALL active contacts
  const { data: allContacts } = await supabase
    .from("contacts")
    .select("id, name")
    .is("deleted_at", null);

  const nameToId = new Map<string, string>();
  for (const c of allContacts || []) {
    nameToId.set(c.name, c.id);
  }

  let updated = 0;
  for (const [indexStr, managerName] of Object.entries(managerNames)) {
    const index = parseInt(indexStr);
    const contact = inserted[index];
    const managerId = nameToId.get(managerName);
    if (contact && managerId) {
      await supabase
        .from("contacts")
        .update({ manager_id: managerId })
        .eq("id", contact.id);
      updated++;
    }
  }

  return c.json({
    success: inserted.length,
    managersLinked: updated,
  }, 201);
});

// ============ SEO Rank Tracker API ============

// snake_case → camelCase 변환 헬퍼
function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

// --- Rank Sites ---
app.get("/api/rank/sites", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const seo = (supabase as any).schema("seo");

  const { data: sites, error } = await seo
    .from("sites")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return safeError(c, error);

  const result = [];
  for (const site of sites || []) {
    const { count } = await seo
      .from("keywords")
      .select("*", { count: "exact", head: true })
      .eq("site_id", site.id);

    result.push({
      ...toCamelCase(site as Record<string, unknown>),
      keywordCount: count || 0,
    });
  }

  return c.json(result);
});

app.post("/api/rank/sites", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const seo = (supabase as any).schema("seo");
  const { name, url } = await c.req.json();

  if (!name || !url) return c.json({ error: "이름과 URL이 필요합니다." }, 400);

  const { data, error } = await seo
    .from("sites")
    .insert({ name, url })
    .select()
    .single();

  if (error) return safeError(c, error);
  return c.json(toCamelCase(data as Record<string, unknown>), 201);
});

app.put("/api/rank/sites/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const seo = (supabase as any).schema("seo");
  const id = c.req.param("id");
  const { name, url } = await c.req.json();

  const updateData: Record<string, string> = {};
  if (name) updateData.name = name;
  if (url) updateData.url = url;

  const { data, error } = await seo
    .from("sites")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) return safeError(c, error);
  return c.json(toCamelCase(data as Record<string, unknown>));
});

app.delete("/api/rank/sites/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const seo = (supabase as any).schema("seo");
  const id = c.req.param("id");

  const { error } = await seo
    .from("sites")
    .delete()
    .eq("id", id);

  if (error) return safeError(c, error);
  return c.json({ message: "삭제되었습니다." });
});

// --- Rank Keywords ---
app.get("/api/rank/keywords", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const seo = (supabase as any).schema("seo");
  const siteId = c.req.query("siteId");

  let query = seo
    .from("keywords")
    .select("*")
    .order("created_at", { ascending: false });

  if (siteId) {
    query = query.eq("site_id", siteId);
  }

  const { data: keywords, error } = await query;
  if (error) return safeError(c, error);

  const result = [];
  for (const kw of keywords || []) {
    const { data: site } = await seo
      .from("sites")
      .select("name, url")
      .eq("id", kw.site_id)
      .single();

    const { data: latestRanking } = await seo
      .from("rankings")
      .select("rank_position, checked_at")
      .eq("keyword_id", kw.id)
      .order("checked_at", { ascending: false })
      .limit(1)
      .single();

    result.push({
      ...toCamelCase(kw as Record<string, unknown>),
      siteName: site?.name || "",
      siteUrl: site?.url || "",
      latestRank: latestRanking?.rank_position || null,
      lastChecked: latestRanking?.checked_at || null,
    });
  }

  return c.json(result);
});

app.post("/api/rank/keywords", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const seo = (supabase as any).schema("seo");
  const { keyword, siteId } = await c.req.json();

  if (!keyword || !siteId) return c.json({ error: "키워드와 사이트 ID가 필요합니다." }, 400);

  const { data, error } = await seo
    .from("keywords")
    .insert({ keyword, site_id: siteId })
    .select()
    .single();

  if (error) return safeError(c, error);
  return c.json(toCamelCase(data as Record<string, unknown>), 201);
});

app.delete("/api/rank/keywords/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const seo = (supabase as any).schema("seo");
  const id = c.req.param("id");

  const { error } = await seo
    .from("keywords")
    .delete()
    .eq("id", id);

  if (error) return safeError(c, error);
  return c.json({ message: "삭제되었습니다." });
});

// --- Rankings ---
app.get("/api/rank/rankings/dashboard/summary", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const seo = (supabase as any).schema("seo");

  const { count: siteCount } = await seo
    .from("sites")
    .select("*", { count: "exact", head: true });

  const { count: keywordCount } = await seo
    .from("keywords")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const { count: todayChecks } = await seo
    .from("rankings")
    .select("*", { count: "exact", head: true })
    .gte("checked_at", `${today}T00:00:00`)
    .lt("checked_at", `${today}T23:59:59`);

  const { data: keywords } = await seo
    .from("keywords")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const latestRankings = [];
  for (const kw of keywords || []) {
    const { data: site } = await seo
      .from("sites")
      .select("name, url")
      .eq("id", kw.site_id)
      .single();

    const { data: ranking } = await seo
      .from("rankings")
      .select("rank_position, checked_at, result_url, result_title")
      .eq("keyword_id", kw.id)
      .order("checked_at", { ascending: false })
      .limit(1)
      .single();

    latestRankings.push({
      keywordId: kw.id,
      keyword: kw.keyword,
      siteName: site?.name || "",
      siteUrl: site?.url || "",
      rankPosition: ranking?.rank_position || null,
      checkedAt: ranking?.checked_at || null,
      resultUrl: ranking?.result_url || null,
      resultTitle: ranking?.result_title || null,
    });
  }

  return c.json({
    stats: {
      siteCount: siteCount || 0,
      keywordCount: keywordCount || 0,
      todayChecks: todayChecks || 0,
    },
    latestRankings,
  });
});

// 순위 체크 (Railway 크롤링 서버로 프록시)
app.post("/api/rank/rankings/check", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const seo = (supabase as any).schema("seo");
  const { keywordIds } = await c.req.json();

  if (!keywordIds || !Array.isArray(keywordIds) || keywordIds.length === 0) {
    return c.json({ error: "키워드 ID 배열이 필요합니다." }, 400);
  }

  const crawlerUrl = c.env.RANKTRACKER_API_URL;
  if (!crawlerUrl) {
    return c.json({ error: "크롤링 서버 URL이 설정되지 않았습니다." }, 500);
  }

  const results = [];
  for (const keywordId of keywordIds) {
    const { data: kw } = await seo
      .from("keywords")
      .select("*")
      .eq("id", keywordId)
      .single();

    if (!kw) {
      results.push({ keywordId, error: "키워드를 찾을 수 없습니다." });
      continue;
    }

    const { data: site } = await seo
      .from("sites")
      .select("url")
      .eq("id", kw.site_id)
      .single();

    if (!site) {
      results.push({ keywordId, error: "사이트를 찾을 수 없습니다." });
      continue;
    }

    try {
      const crawlRes = await fetch(`${crawlerUrl}/api/crawl/keyword-rank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: kw.keyword, siteUrl: site.url }),
      });

      if (!crawlRes.ok) throw new Error("크롤링 서버 응답 오류");

      const crawlResult = await crawlRes.json() as { rank?: number | null; url?: string | null; title?: string | null };

      await seo
        .from("rankings")
        .insert({
          keyword_id: keywordId,
          rank_position: crawlResult?.rank || null,
          search_type: "view",
          result_url: crawlResult?.url || null,
          result_title: crawlResult?.title || null,
        });

      results.push({
        keywordId,
        keyword: kw.keyword,
        rank: crawlResult?.rank || null,
        url: crawlResult?.url || null,
        title: crawlResult?.title || null,
      });
    } catch (err) {
      results.push({ keywordId, error: String(err) });
    }
  }

  return c.json({ results });
});

// --- URL Tracking ---
app.get("/api/rank/url-tracking", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const seo = (supabase as any).schema("seo");

  const { data: tracked, error } = await seo
    .from("tracked_urls")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) return safeError(c, error);

  const result = [];
  for (const t of tracked || []) {
    const { data: latestRanking } = await seo
      .from("url_rankings")
      .select("rank_position, section_name, section_rank, checked_at")
      .eq("tracked_url_id", t.id)
      .order("checked_at", { ascending: false })
      .limit(1)
      .single();

    result.push({
      ...toCamelCase(t as Record<string, unknown>),
      latestRank: latestRanking?.rank_position || null,
      latestSection: latestRanking?.section_name || null,
      latestSectionRank: latestRanking?.section_rank || null,
      lastChecked: latestRanking?.checked_at || null,
    });
  }

  return c.json(result);
});

app.post("/api/rank/url-tracking", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const seo = (supabase as any).schema("seo");
  const { keyword, targetUrl, section, memo } = await c.req.json();

  if (!keyword || !targetUrl) {
    return c.json({ error: "키워드와 대상 URL은 필수입니다." }, 400);
  }

  const { data, error } = await seo
    .from("tracked_urls")
    .insert({
      keyword,
      target_url: targetUrl,
      section: section || null,
      memo: memo || null,
    })
    .select()
    .single();

  if (error) return safeError(c, error);
  return c.json(toCamelCase(data as Record<string, unknown>), 201);
});

app.delete("/api/rank/url-tracking/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const seo = (supabase as any).schema("seo");
  const id = c.req.param("id");

  const { error } = await seo
    .from("tracked_urls")
    .delete()
    .eq("id", id);

  if (error) return safeError(c, error);
  return c.json({ message: "삭제되었습니다." });
});

// URL 순위 체크 (Railway 크롤링 서버로 프록시)
app.post("/api/rank/url-tracking/check", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const seo = (supabase as any).schema("seo");
  const { trackedUrlIds } = await c.req.json();

  if (!trackedUrlIds || !Array.isArray(trackedUrlIds) || trackedUrlIds.length === 0) {
    return c.json({ error: "추적 URL ID 배열이 필요합니다." }, 400);
  }

  const crawlerUrl = c.env.RANKTRACKER_API_URL;
  if (!crawlerUrl) {
    return c.json({ error: "크롤링 서버 URL이 설정되지 않았습니다." }, 500);
  }

  const results = [];
  for (const id of trackedUrlIds) {
    const { data: tracked } = await seo
      .from("tracked_urls")
      .select("*")
      .eq("id", id)
      .single();

    if (!tracked) {
      results.push({ trackedUrlId: id, error: "추적 URL을 찾을 수 없습니다." });
      continue;
    }

    try {
      const crawlRes = await fetch(`${crawlerUrl}/api/crawl/url-exposure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: tracked.keyword, targetUrl: tracked.target_url }),
      });

      if (!crawlRes.ok) throw new Error("크롤링 서버 응답 오류");

      const crawlResult = await crawlRes.json() as {
        found?: boolean;
        sectionName?: string | null;
        sectionRank?: number | null;
        overallRank?: number | null;
      };

      // section 필터: 지정된 영역이 있으면 해당 영역 순위 사용
      const rankPosition = tracked.section && crawlResult?.sectionName === tracked.section
        ? crawlResult?.overallRank || null
        : crawlResult?.overallRank || null;

      await seo
        .from("url_rankings")
        .insert({
          tracked_url_id: id,
          rank_position: rankPosition,
          section_name: crawlResult?.sectionName || null,
          section_rank: crawlResult?.sectionRank || null,
        });

      results.push({
        trackedUrlId: id,
        keyword: tracked.keyword,
        targetUrl: tracked.target_url,
        rankPosition,
        sectionName: crawlResult?.sectionName || null,
        sectionRank: crawlResult?.sectionRank || null,
        found: crawlResult?.found || false,
      });
    } catch (err) {
      results.push({ trackedUrlId: id, error: String(err) });
    }
  }

  return c.json({ results });
});

// --- Rank History ---
app.get("/api/rank/rankings/history", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const seo = (supabase as any).schema("seo");

  const { startDate, endDate, type } = c.req.query();

  if (!startDate || !endDate || !type) {
    return c.json({ error: "startDate, endDate, type 파라미터가 필요합니다." }, 400);
  }

  if (type === "keyword") {
    const { data: rankings, error } = await seo
      .from("rankings")
      .select("id, keyword_id, rank_position, checked_at, result_url, result_title")
      .gte("checked_at", `${startDate}T00:00:00`)
      .lte("checked_at", `${endDate}T23:59:59`)
      .order("checked_at", { ascending: false })
      .limit(500);

    if (error) return safeError(c, error);

    const result = [];
    for (const r of rankings || []) {
      const { data: kw } = await seo
        .from("keywords")
        .select("keyword, site_id")
        .eq("id", r.keyword_id)
        .single();

      let siteName = "";
      if (kw?.site_id) {
        const { data: site } = await seo
          .from("sites")
          .select("name")
          .eq("id", kw.site_id)
          .single();
        siteName = site?.name || "";
      }

      result.push({
        id: r.id,
        checkedAt: r.checked_at,
        siteName,
        keyword: kw?.keyword || "",
        rankPosition: r.rank_position,
        resultUrl: r.result_url,
        resultTitle: r.result_title,
      });
    }

    return c.json(result);
  } else if (type === "url") {
    const { data: rankings, error } = await seo
      .from("url_rankings")
      .select("id, tracked_url_id, rank_position, section_name, section_rank, checked_at")
      .gte("checked_at", `${startDate}T00:00:00`)
      .lte("checked_at", `${endDate}T23:59:59`)
      .order("checked_at", { ascending: false })
      .limit(500);

    if (error) return safeError(c, error);

    const result = [];
    for (const r of rankings || []) {
      const { data: tracked } = await seo
        .from("tracked_urls")
        .select("keyword, target_url")
        .eq("id", r.tracked_url_id)
        .single();

      result.push({
        id: r.id,
        checkedAt: r.checked_at,
        keyword: tracked?.keyword || "",
        targetUrl: tracked?.target_url || "",
        rankPosition: r.rank_position,
        sectionName: r.section_name,
        sectionRank: r.section_rank,
      });
    }

    return c.json(result);
  }

  return c.json({ error: "type은 keyword 또는 url이어야 합니다." }, 400);
});

// ============ Board Categories API ============

// 게시판 카테고리 목록
app.get("/api/board-categories", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const activeOnly = c.req.query("active") === "true";

  try {
    let query = supabase
      .from("board_categories")
      .select("*")
      .order("sort_order", { ascending: true });

    if (activeOnly) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) return safeError(c, error);

    const categories = (data || []).map((cat: any) => ({
      id: cat.id,
      slug: cat.slug,
      name: cat.name,
      icon: cat.icon,
      sortOrder: cat.sort_order,
      displayType: cat.display_type || "table",
      isActive: cat.is_active,
    }));

    return c.json(categories);
  } catch (err) {
    return safeError(c, err);
  }
});

// 게시판 카테고리 생성 (F1)
app.post("/api/board-categories", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();
  const { name, slug, icon, sortOrder } = body;

  if (!name || !slug) {
    return c.json({ error: "이름과 slug는 필수입니다." }, 400);
  }

  try {
    const { data: cat, error } = await supabase
      .from("board_categories")
      .insert({
        name,
        slug,
        icon: icon || null,
        sort_order: sortOrder || 0,
      })
      .select()
      .single();

    if (error) return safeError(c, error);

    // app_settings에 기본 메뉴 권한 자동 삽입
    const defaultRoles = { F1:"editor",F2:"viewer",F3:"viewer",F4:"viewer",F5:"viewer",M1:"viewer",M2:"viewer",M3:"viewer" };
    await supabase.from("app_settings").upsert({
      key: `menu_role:/board/${slug}`,
      value: JSON.stringify(defaultRoles),
    }, { onConflict: "key" });

    return c.json({
      id: cat.id,
      slug: cat.slug,
      name: cat.name,
      icon: cat.icon,
      sortOrder: cat.sort_order,
      isActive: cat.is_active,
    }, 201);
  } catch (err) {
    return safeError(c, err);
  }
});

// 게시판 카테고리 수정 (F1)
app.put("/api/board-categories/:id", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = parseInt(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "유효하지 않은 ID" }, 400);

  const body = await c.req.json();
  const { name, slug, icon, sortOrder, isActive } = body;

  try {
    // 기존 카테고리 조회 (slug 변경 감지용)
    const { data: oldCat } = await supabase
      .from("board_categories")
      .select("slug")
      .eq("id", id)
      .single();

    if (!oldCat) return c.json({ error: "카테고리를 찾을 수 없습니다." }, 404);

    const updateData: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (icon !== undefined) updateData.icon = icon;
    if (sortOrder !== undefined) updateData.sort_order = sortOrder;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data: cat, error } = await supabase
      .from("board_categories")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) return safeError(c, error);

    // slug 변경 시 posts.category + app_settings 키 업데이트
    if (slug && slug !== oldCat.slug) {
      await supabase
        .from("posts")
        .update({ category: slug })
        .eq("category", oldCat.slug);

      // app_settings 키 마이그레이션
      const { data: oldSetting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", `menu_role:/board/${oldCat.slug}`)
        .single();

      if (oldSetting) {
        await supabase.from("app_settings").upsert({
          key: `menu_role:/board/${slug}`,
          value: oldSetting.value,
        }, { onConflict: "key" });
        await supabase
          .from("app_settings")
          .delete()
          .eq("key", `menu_role:/board/${oldCat.slug}`);
      }
    }

    return c.json({
      id: cat.id,
      slug: cat.slug,
      name: cat.name,
      icon: cat.icon,
      sortOrder: cat.sort_order,
      isActive: cat.is_active,
    });
  } catch (err) {
    return safeError(c, err);
  }
});

// 게시판 카테고리 삭제 (F1)
app.delete("/api/board-categories/:id", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = parseInt(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "유효하지 않은 ID" }, 400);

  try {
    // 카테고리 조회
    const { data: cat } = await supabase
      .from("board_categories")
      .select("slug")
      .eq("id", id)
      .single();

    if (!cat) return c.json({ error: "카테고리를 찾을 수 없습니다." }, 404);

    // 해당 카테고리에 글이 있는지 확인
    const { count } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("category", cat.slug)
      .is("deleted_at", null);

    if (count && count > 0) {
      return c.json({ error: `해당 카테고리에 ${count}개의 게시글이 있어 삭제할 수 없습니다.` }, 400);
    }

    const { error } = await supabase
      .from("board_categories")
      .delete()
      .eq("id", id);

    if (error) return safeError(c, error);

    // app_settings 정리
    await supabase
      .from("app_settings")
      .delete()
      .eq("key", `menu_role:/board/${cat.slug}`);

    return c.json({ success: true });
  } catch (err) {
    return safeError(c, err);
  }
});

// ============ Posts (게시판) API ============

// 게시글 목록
app.get("/api/posts", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const { page, limit, offset } = parsePagination(c);
  const category = c.req.query("category") || "";
  const search = c.req.query("search") || "";

  try {
    let query = supabase
      .from("posts")
      .select("*, author:employees!author_id(id, full_name)", { count: "exact" })
      .is("deleted_at", null);

    if (category) query = query.eq("category", category);
    if (search) query = query.ilike("title", `%${search}%`);

    // 상단 고정 우선, 그 다음 최신순
    query = query
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) return safeError(c, error);

    const posts = (data || []).map((p: any) => ({
      id: p.id,
      category: p.category,
      title: p.title,
      content: p.content,
      isPinned: p.is_pinned,
      authorId: p.author_id,
      authorName: p.author?.full_name || "",
      viewCount: p.view_count,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    return c.json({
      data: posts,
      total: count || 0,
      page,
      limit,
    });
  } catch (err) {
    return safeError(c, err);
  }
});

// 게시글 상세
app.get("/api/posts/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = parseInt(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "유효하지 않은 ID" }, 400);

  try {
    // view_count 증가
    await supabase.rpc("increment_post_view_count" as any, { p_post_id: id });

    const { data: post, error } = await supabase
      .from("posts")
      .select("*, author:employees!author_id(id, full_name)")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error || !post) return c.json({ error: "게시글을 찾을 수 없습니다." }, 404);

    const { data: attachments } = await supabase
      .from("post_attachments")
      .select("*")
      .eq("post_id", id)
      .order("id");

    return c.json({
      id: post.id,
      category: (post as any).category,
      title: (post as any).title,
      content: (post as any).content,
      isPinned: (post as any).is_pinned,
      authorId: (post as any).author_id,
      authorName: (post as any).author?.full_name || "",
      viewCount: (post as any).view_count + 1,
      createdAt: (post as any).created_at,
      updatedAt: (post as any).updated_at,
      attachments: (attachments || []).map((a: any) => ({
        id: a.id,
        fileName: a.file_name,
        fileUrl: a.file_url,
      })),
    });
  } catch (err) {
    return safeError(c, err);
  }
});

// 게시글 생성 (F1)
app.post("/api/posts", async (c) => {
  const body = await c.req.json();
  const { title, content, category, isPinned, attachments } = body;

  if (!title || !content || !category) {
    return c.json({ error: "제목, 내용, 카테고리는 필수입니다." }, 400);
  }

  const denied = await requireBoardEditor(c, category);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const emp = await getAuthEmployee(c);

  try {
    const { data: post, error } = await supabase
      .from("posts")
      .insert({
        title,
        content,
        category,
        is_pinned: isPinned || false,
        author_id: emp.id,
      })
      .select()
      .single();

    if (error) return safeError(c, error);

    // 첨부파일 저장
    if (attachments?.length > 0) {
      const rows = attachments.map((a: any) => ({
        post_id: post.id,
        file_name: a.fileName,
        file_url: a.fileUrl,
      }));
      await supabase.from("post_attachments").insert(rows);
    }

    return c.json(post, 201);
  } catch (err) {
    return safeError(c, err);
  }
});

// 게시글 수정 (메뉴 권한 editor)
app.put("/api/posts/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = parseInt(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "유효하지 않은 ID" }, 400);

  const { data: existing } = await supabase
    .from("posts")
    .select("category")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (!existing) return c.json({ error: "게시글을 찾을 수 없습니다." }, 404);

  const denied = await requireBoardEditor(c, existing.category);
  if (denied) return denied;

  const body = await c.req.json();
  const { title, content, isPinned, attachments } = body;

  try {
    const updateData: any = { updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (isPinned !== undefined) updateData.is_pinned = isPinned;

    const { data: post, error } = await supabase
      .from("posts")
      .update(updateData)
      .eq("id", id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return safeError(c, error, 404);

    // 첨부파일 교체: 기존 삭제 후 재삽입
    if (attachments !== undefined) {
      await supabase.from("post_attachments").delete().eq("post_id", id);
      if (attachments.length > 0) {
        const rows = attachments.map((a: any) => ({
          post_id: id,
          file_name: a.fileName,
          file_url: a.fileUrl,
        }));
        await supabase.from("post_attachments").insert(rows);
      }
    }

    return c.json(post);
  } catch (err) {
    return safeError(c, err);
  }
});

// 게시글 삭제 (메뉴 권한 editor, soft delete)
app.delete("/api/posts/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = parseInt(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "유효하지 않은 ID" }, 400);

  const { data: existing } = await supabase
    .from("posts")
    .select("category")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (!existing) return c.json({ error: "게시글을 찾을 수 없습니다." }, 404);

  const denied = await requireBoardEditor(c, existing.category);
  if (denied) return denied;

  try {
    const { error } = await supabase
      .from("posts")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null);

    if (error) return safeError(c, error);
    return c.json({ success: true });
  } catch (err) {
    return safeError(c, err);
  }
});

// ============ Menu Roles API ============

// 기본 권한 매핑 (시드 데이터와 동일)
const DEFAULT_MENU_ROLES: Record<string, Record<string, string>> = {
  "/":                          { F1:"editor",F2:"editor",F3:"editor",F4:"editor",F5:"editor",M1:"editor",M2:"editor",M3:"editor" },
  "/customers":                 { F1:"editor",F2:"editor",F3:"editor",F4:"editor",F5:"editor",M1:"none",M2:"none",M3:"none" },
  "/customers/trash":           { F1:"editor",F2:"editor",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
  "/inquiries":                 { F1:"editor",F2:"editor",F3:"editor",F4:"editor",F5:"viewer",M1:"editor",M2:"editor",M3:"viewer" },
  "/consultant-inquiries":      { F1:"editor",F2:"editor",F3:"editor",F4:"editor",F5:"viewer",M1:"editor",M2:"editor",M3:"viewer" },
  "/recruit-inquiries":         { F1:"editor",F2:"editor",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"none",M3:"none" },
  "/team":                      { F1:"editor",F2:"editor",F3:"editor",F4:"editor",F5:"viewer",M1:"editor",M2:"viewer",M3:"viewer" },
  "/contacts-direct":           { F1:"editor",F2:"editor",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
  "/ads/ndata":                 { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"viewer",M3:"none" },
  "/ads/powerlink":             { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"viewer",M3:"none" },
  "/ads/report":                { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"viewer",M3:"none" },
  "/ads/weekly":                { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"viewer",M3:"none" },
  "/ads/rank-dashboard":        { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"viewer",M3:"none" },
  "/ads/rank-keywords":         { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"viewer",M3:"none" },
  "/ads/rank-urls":             { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"viewer",M3:"none" },
  "/ads/rank-history":          { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"viewer",M3:"none" },
  "/settings/organizations":    { F1:"editor",F2:"viewer",F3:"viewer",F4:"viewer",F5:"viewer",M1:"none",M2:"none",M3:"none" },
  "/settings/labels":           { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
  "/settings/menus":            { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
  "/settings/menu-permissions": { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
  "/settings/board-categories": { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
  "/settings/employees":        { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
  "/settings/approvals":        { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
};

// 게시판 카테고리 기본 권한 (동적)
const BOARD_DEFAULT_ROLE: Record<string, string> = { F1:"editor",F2:"viewer",F3:"viewer",F4:"viewer",F5:"viewer",M1:"viewer",M2:"viewer",M3:"viewer" };

// 메뉴 role 조회 헬퍼: 오버라이드 > app_settings > 하드코딩 기본값
async function getMenuRoleMap(c: any): Promise<Record<string, string>> {
  const emp = await getAuthEmployee(c);
  if (!emp) return {};

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;

  // 동적 게시판 카테고리 조회
  const { data: boardCats } = await supabase
    .from("board_categories")
    .select("slug")
    .eq("is_active", true);

  // F1은 항상 전 메뉴 editor
  if (emp.security_level === "F1") {
    const result: Record<string, string> = {};
    for (const path of Object.keys(DEFAULT_MENU_ROLES)) {
      result[path] = "editor";
    }
    // 동적 게시판 카테고리도 editor
    if (boardCats) {
      for (const cat of boardCats) {
        result[`/board/${cat.slug}`] = "editor";
      }
    }
    return result;
  }

  const level = emp.security_level;

  // 1. app_settings에서 등급별 기본값 로드
  const { data: settings } = await supabase
    .from("app_settings")
    .select("key, value")
    .like("key", "menu_role:%");

  const roleMap: Record<string, string> = {};
  for (const path of Object.keys(DEFAULT_MENU_ROLES)) {
    // 하드코딩 기본값
    roleMap[path] = DEFAULT_MENU_ROLES[path]?.[level] || "none";
  }

  // 동적 게시판 카테고리 기본 권한
  if (boardCats) {
    for (const cat of boardCats) {
      roleMap[`/board/${cat.slug}`] = BOARD_DEFAULT_ROLE[level] || "none";
    }
  }

  // app_settings 오버라이드 (등급별)
  if (settings) {
    for (const s of settings) {
      const menuPath = s.key.replace("menu_role:", "");
      try {
        const parsed = JSON.parse(s.value || "{}");
        if (parsed[level] !== undefined) {
          roleMap[menuPath] = parsed[level];
        }
      } catch { /* ignore */ }
    }
  }

  // 2. 개별 직원 오버라이드
  const { data: overrides } = await supabase
    .from("employee_menu_overrides")
    .select("menu_path, role")
    .eq("employee_id", emp.id);

  if (overrides) {
    for (const o of overrides) {
      roleMap[o.menu_path] = o.role;
    }
  }

  return roleMap;
}

// GET /api/menu-roles/me - 현재 사용자의 전 메뉴 role 맵
app.get("/api/menu-roles/me", async (c) => {
  try {
    const roleMap = await getMenuRoleMap(c);
    return c.json(roleMap);
  } catch (err) {
    return safeError(c, err);
  }
});

// GET /api/menu-overrides?employeeId=xxx - F1 전용, 특정 직원 오버라이드 조회
app.get("/api/menu-overrides", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const employeeId = c.req.query("employeeId");
  if (!employeeId) {
    return c.json({ error: "employeeId 파라미터가 필요합니다." }, 400);
  }

  const { data, error } = await supabase
    .from("employee_menu_overrides")
    .select("menu_path, role")
    .eq("employee_id", employeeId);

  if (error) return safeError(c, error);
  return c.json((data || []).map((o: any) => ({ menuPath: o.menu_path, role: o.role })));
});

// PUT /api/menu-overrides - F1 전용, 오버라이드 일괄 저장
app.put("/api/menu-overrides", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();
  const { employeeId, overrides } = body as {
    employeeId: string;
    overrides: Array<{ menuPath: string; role: string }>;
  };

  if (!employeeId || !Array.isArray(overrides)) {
    return c.json({ error: "employeeId와 overrides 배열이 필요합니다." }, 400);
  }

  // 기존 오버라이드 전체 삭제 후 재삽입
  const { error: delError } = await supabase
    .from("employee_menu_overrides")
    .delete()
    .eq("employee_id", employeeId);

  if (delError) return safeError(c, delError);

  // none이 아닌 오버라이드만 저장 (기본값과 다른 것만)
  const toInsert = overrides
    .filter((o) => o.role && o.menuPath)
    .map((o) => ({
      employee_id: employeeId,
      menu_path: o.menuPath,
      role: o.role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

  if (toInsert.length > 0) {
    const { error: insError } = await supabase
      .from("employee_menu_overrides")
      .insert(toInsert);

    if (insError) return safeError(c, insError);
  }

  return c.json({ success: true });
});

// ============ Dashboard Cards API ============

// GET /api/dashboard-cards - 카드 목록
app.get("/api/dashboard-cards", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;

  try {
    const { data, error } = await supabase
      .from("dashboard_cards")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) return safeError(c, error);
    return c.json(data);
  } catch (err) {
    return safeError(c, err);
  }
});

// POST /api/dashboard-cards - 카드 생성 (editor 권한)
app.post("/api/dashboard-cards", async (c) => {
  const emp = await getAuthEmployee(c);
  if (!emp) return c.json({ error: "사원 정보를 찾을 수 없습니다." }, 403);

  const roleMap = await getMenuRoleMap(c);
  if (roleMap["/"] !== "editor") {
    return c.json({ error: "권한이 부족합니다." }, 403);
  }

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();
  const { title, description, imageUrl, linkUrl, sortOrder } = body;

  if (!title) {
    return c.json({ error: "제목은 필수입니다." }, 400);
  }

  try {
    const { data, error } = await supabase
      .from("dashboard_cards")
      .insert({
        title,
        description: description || null,
        image_url: imageUrl || null,
        link_url: linkUrl || null,
        sort_order: sortOrder ?? 0,
        created_by: emp.id,
      })
      .select()
      .single();

    if (error) return safeError(c, error);
    return c.json(data, 201);
  } catch (err) {
    return safeError(c, err);
  }
});

// PUT /api/dashboard-cards/:id - 카드 수정 (editor 권한)
app.put("/api/dashboard-cards/:id", async (c) => {
  const emp = await getAuthEmployee(c);
  if (!emp) return c.json({ error: "사원 정보를 찾을 수 없습니다." }, 403);

  const roleMap = await getMenuRoleMap(c);
  if (roleMap["/"] !== "editor") {
    return c.json({ error: "권한이 부족합니다." }, 403);
  }

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = parseInt(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "유효하지 않은 ID" }, 400);

  const body = await c.req.json();
  const { title, description, imageUrl, linkUrl, sortOrder } = body;

  try {
    const updateData: any = { updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (imageUrl !== undefined) updateData.image_url = imageUrl;
    if (linkUrl !== undefined) updateData.link_url = linkUrl;
    if (sortOrder !== undefined) updateData.sort_order = sortOrder;

    const { data, error } = await supabase
      .from("dashboard_cards")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) return safeError(c, error, 404);
    return c.json(data);
  } catch (err) {
    return safeError(c, err);
  }
});

// DELETE /api/dashboard-cards/:id - 카드 삭제 (editor 권한)
app.delete("/api/dashboard-cards/:id", async (c) => {
  const emp = await getAuthEmployee(c);
  if (!emp) return c.json({ error: "사원 정보를 찾을 수 없습니다." }, 403);

  const roleMap = await getMenuRoleMap(c);
  if (roleMap["/"] !== "editor") {
    return c.json({ error: "권한이 부족합니다." }, 403);
  }

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = parseInt(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "유효하지 않은 ID" }, 400);

  try {
    const { error } = await supabase
      .from("dashboard_cards")
      .delete()
      .eq("id", id);

    if (error) return safeError(c, error);
    return c.json({ success: true });
  } catch (err) {
    return safeError(c, err);
  }
});

// Cloudflare Pages Functions export
import { handle } from "hono/cloudflare-pages";
export const onRequest = handle(app);
export default app;
