import { Hono } from "hono";
import { cors } from "hono/cors";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// 환경 변수 타입 정의
interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  JUSO_API_KEY: string;
}

// Hono 앱 생성
const app = new Hono<{ Bindings: Env }>();

// CORS 설정
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "https://crm3.pages.dev"],
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

// 헬스 체크 엔드포인트
app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ============ Customers API ============
app.get("/api/customers", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;

  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");
  const search = c.req.query("search") || "";
  const status = c.req.query("status") || "";
  const managerId = c.req.query("managerId") || "";
  const type = c.req.query("type") || "";
  const sortBy = c.req.query("sortBy") || "created_at";
  const sortOrder = c.req.query("sortOrder") || "desc";

  const offset = (page - 1) * limit;

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
    return c.json({ error: error.message }, 500);
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
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");
  const search = c.req.query("search") || "";
  const offset = (page - 1) * limit;

  let query = supabase.from("customers").select("*", { count: "exact" }).not("deleted_at", "is", null);

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  query = query.order("deleted_at", { ascending: false });
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    return c.json({ error: error.message }, 500);
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
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  });
});

app.post("/api/customers", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();

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
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
  }

  return c.json(data);
});

app.delete("/api/customers/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");

  // Soft delete
  const { error } = await supabase
    .from("customers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ success: true });
});

// 완전 삭제
app.delete("/api/customers/:id/permanent", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");

  const { error } = await supabase.from("customers").delete().eq("id", id);

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ success: true });
});

// 복원
app.post("/api/customers/:id/restore", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");

  const { error } = await supabase
    .from("customers")
    .update({ deleted_at: null, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
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
    authorName: "작성자",
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
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
  }

  return c.json(data);
});

app.delete("/api/contracts/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");

  const { error } = await supabase.from("contracts").delete().eq("id", id);

  if (error) {
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notes = (data || []).map((row: any) => ({
    id: row.id,
    customerId: row.customer_id,
    content: row.content,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    authorName: "작성자",
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
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
  }

  return c.json(data);
});

app.delete("/api/notes/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");

  const { error } = await supabase.from("customer_notes").delete().eq("id", id);

  if (error) {
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
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
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();

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
    return c.json({ error: error.message }, 500);
  }

  return c.json(data, 201);
});

app.put("/api/employees/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");
  const body = await c.req.json();

  // 이메일 변경 시 중복 체크
  if (body.email !== undefined) {
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

  if (body.email !== undefined) updateData.email = body.email;
  if (body.fullName !== undefined) updateData.full_name = body.fullName;
  if (body.securityLevel !== undefined)
    updateData.security_level = body.securityLevel;
  if (body.organizationId !== undefined)
    updateData.organization_id = body.organizationId;
  if (body.parentId !== undefined) updateData.parent_id = body.parentId;
  if (body.positionName !== undefined)
    updateData.position_name = body.positionName;
  if (body.department !== undefined) updateData.department = body.department;
  if (body.isActive !== undefined) updateData.is_active = body.isActive;

  const { data, error } = await supabase
    .from("employees")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data);
});

app.delete("/api/employees/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");

  // Soft delete
  const { error } = await supabase
    .from("employees")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ success: true });
});

app.put("/api/employees/:id/restore", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");

  const { data, error } = await supabase
    .from("employees")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data);
});

// 완전 삭제 (비활성 사원만)
app.delete("/api/employees/:id/permanent", async (c) => {
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
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
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
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();

  const { data, error } = await supabase
    .from("sources")
    .insert({ name: body.name })
    .select()
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(
    { id: data.id, name: data.name, createdAt: data.created_at },
    201
  );
});

app.put("/api/sources/:id", async (c) => {
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
    return c.json({ error: error.message }, 500);
  }

  return c.json({ id: data.id, name: data.name, createdAt: data.created_at });
});

app.delete("/api/sources/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");

  const { error } = await supabase.from("sources").delete().eq("id", id);

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ success: true });
});

// ============ Dashboard API ============
app.get("/api/dashboard", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const managerId = c.req.query("managerId") || "";

  let query = supabase
    .from("customers")
    .select("id, status", { count: "exact" });

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
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;

  const { data, error } = await supabase
    .from("pending_approvals")
    .select("*")
    .eq("status", "pending")
    .order("requested_at", { ascending: true });

  if (error) {
    return c.json({ error: error.message }, 500);
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
  if (body.email === "imnakjoo@gmail.com") {
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
    return c.json({ error: error.message }, 500);
  }

  return c.json(data, 201);
});

app.put("/api/pending-approvals/:id/approve", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");
  const body = await c.req.json();

  // 이메일 중복 체크
  const { data: existing } = await supabase
    .from("employees")
    .select("id")
    .eq("email", body.email)
    .single();

  if (existing) {
    return c.json({ error: "이미 등록된 이메일입니다." }, 409);
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
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
  }

  return c.json(data, 201);
});

app.put("/api/organizations/:id", async (c) => {
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
    return c.json({ error: error.message }, 500);
  }

  return c.json(data);
});

app.delete("/api/organizations/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");

  const { error } = await supabase.from("organizations").delete().eq("id", id);

  if (error) {
    return c.json({ error: error.message }, 500);
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
      return c.json({ error: error.message }, 500);
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
      .eq("manager_id", empId);

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
    .in("manager_id", memberIds);

  if (error) {
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
  }

  return c.json({ success: true });
});

// ============ Inquiries API (marketing.inquiries) ============

app.get("/api/inquiries", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;

  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "15");
  const search = c.req.query("search") || "";
  const status = c.req.query("status") || "";
  const managerId = c.req.query("managerId") || "";

  const offset = (page - 1) * limit;

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
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
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

  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "15");
  const search = c.req.query("search") || "";
  const status = c.req.query("status") || "";
  const managerId = c.req.query("managerId") || "";

  const offset = (page - 1) * limit;

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
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
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

  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "15");
  const search = c.req.query("search") || "";
  const status = c.req.query("status") || "";
  const managerId = c.req.query("managerId") || "";

  const offset = (page - 1) * limit;

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

  query = query.order("created_at", { ascending: false });
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
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
  if (error) return c.json({ error: error.message }, 500);

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

  if (error) return c.json({ error: error.message }, 500);
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

  if (error) return c.json({ error: error.message }, 500);
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
  if (error) return c.json({ error: error.message }, 500);

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

  const { error } = await (supabase as any)
    .schema("marketing")
    .from("inquiries")
    .insert(body);

  if (error) return c.json({ error: error.message }, 500);
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

  if (error) return c.json({ error: error.message }, 500);

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

  if (error) return c.json({ error: error.message }, 500);
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

  if (error) return c.json({ error: error.message }, 500);

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

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ success: true });
});

// GA Edge Function 프록시: Summary
app.post("/api/ads/ga/edge-summary", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();

  const { data, error } = await (supabase as any).functions.invoke("google-analytics/summary", {
    method: "POST",
    body,
  });

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// GA Edge Function 프록시: Total Sessions
app.post("/api/ads/ga/edge-total-sessions", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();

  const { data, error } = await (supabase as any).functions.invoke("google-analytics/total-sessions", {
    method: "POST",
    body,
  });

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// ============ Settings API ============
app.get("/api/settings", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;

  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value");

  if (error) return c.json({ error: error.message }, 500);

  return c.json(
    (data || []).map((row: any) => ({ key: row.key, value: row.value }))
  );
});

app.put("/api/settings", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();
  const items = body.items as Array<{ key: string; value: string | null }>;

  for (const item of items) {
    if (item.value) {
      await supabase.from("app_settings").upsert(
        { key: item.key, value: item.value, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    } else {
      await supabase.from("app_settings").delete().eq("key", item.key);
    }
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

  if (error) return c.json({ error: error.message }, 500);

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

  if (error) return c.json({ error: error.message }, 500);

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

  if (error) return c.json({ error: error.message }, 500);

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

  if (error) return c.json({ error: error.message }, 500);
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

  if (error) return c.json({ error: error.message }, 500);

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

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ success: true });
});

// DELETE /api/contacts/:id/permanent - 완전 삭제
app.delete("/api/contacts/:id/permanent", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");

  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", id);

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ success: true });
});

// DELETE /api/contacts/trash/empty - 휴지통 비우기
app.delete("/api/contacts/trash/empty", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;

  const { error } = await supabase
    .from("contacts")
    .delete()
    .not("deleted_at", "is", null);

  if (error) return c.json({ error: error.message }, 500);
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

// Cloudflare Pages Functions export
import { handle } from "hono/cloudflare-pages";
export const onRequest = handle(app);
export default app;
