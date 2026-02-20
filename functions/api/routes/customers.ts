import { Hono } from "hono";
import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import type { Env } from "../middleware/auth";
import { requireSecurityLevel, getAuthEmployee } from "../middleware/auth";
import { safeError, parsePagination, sanitizeSearch } from "../middleware/helpers";

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;

  const { page, limit, offset } = parsePagination(c);
  const search = sanitizeSearch(c.req.query("search") || "");
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

  const ALLOWED_SORT_COLUMNS: Record<string, string> = {
    created_at: "created_at",
    updated_at: "updated_at",
    createdAt: "created_at",
    updatedAt: "updated_at",
    name: "name",
    status: "status",
  };
  const sortColumn = ALLOWED_SORT_COLUMNS[sortBy] || "created_at";

  query = query.order(sortColumn, { ascending: sortOrder === "asc" });
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    return safeError(c, error);
  }

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

  // 최신 메모 조회 (customer_notes에서 각 고객의 가장 최근 메모 1건)
  const customerIds = (data || []).map((c) => c.id);
  let latestNotesMap: Record<number, string> = {};
  if (customerIds.length > 0) {
    const { data: notes } = await supabase
      .from("customer_notes")
      .select("customer_id, content, created_at")
      .in("customer_id", customerIds)
      .order("created_at", { ascending: false });

    if (notes) {
      for (const note of notes) {
        if (!latestNotesMap[note.customer_id]) {
          latestNotesMap[note.customer_id] = note.content;
        }
      }
    }
  }

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
    latestNote: latestNotesMap[row.id] || null,
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
app.get("/trash", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const { page, limit, offset } = parsePagination(c);
  const search = sanitizeSearch(c.req.query("search") || "");

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

app.get("/:id", async (c) => {
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

app.post("/", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();

  if (!body.name) {
    return c.json({ error: "name은 필수입니다." }, 400);
  }

  // 빈 문자열을 null로 변환 (enum/date 컬럼에 빈 문자열 입력 방지)
  const toNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

  const dbInput = {
    name: body.name,
    phone: toNull(body.phone),
    email: toNull(body.email),
    address: toNull(body.address),
    address_detail: toNull(body.addressDetail),
    gender: toNull(body.gender),
    birthdate: toNull(body.birthdate),
    company: toNull(body.company),
    job_title: toNull(body.jobTitle),
    source: toNull(body.source),
    status: body.status || "new",
    manager_id: body.managerId,
    type: body.type || "personal",
    interest_product: toNull(body.interestProduct),
    memo: toNull(body.memo),
    admin_comment: toNull(body.adminComment),
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

app.put("/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const emp = await getAuthEmployee(c);
  if (!emp) return c.json({ error: "사원 정보를 찾을 수 없습니다." }, 403);

  const id = c.req.param("id");

  // F5는 본인 담당 고객만 수정 가능
  if (!["F1", "F2", "F3", "F4"].includes(emp.security_level)) {
    const { data: customer } = await supabase
      .from("customers")
      .select("manager_id")
      .eq("id", id)
      .single();
    if (!customer) return c.json({ error: "고객을 찾을 수 없습니다." }, 404);
    if (customer.manager_id !== emp.id) {
      return c.json({ error: "본인 담당 고객만 수정할 수 있습니다." }, 403);
    }
  }

  const body = await c.req.json();

  const dbInput: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.name !== undefined) dbInput.name = body.name;
  if (body.phone !== undefined) dbInput.phone = body.phone;
  if (body.email !== undefined) dbInput.email = body.email;
  if (body.address !== undefined) dbInput.address = body.address;
  if (body.addressDetail !== undefined) dbInput.address_detail = body.addressDetail;
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

app.delete("/:id", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1", "F2", "F3", "F4", "F5"]);
  if (denied) return denied;
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");

  const { error } = await supabase
    .from("customers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return safeError(c, error);
  }

  return c.json({ success: true });
});

app.delete("/:id/permanent", async (c) => {
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

app.post("/:id/restore", async (c) => {
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

// 고객 이관 (Team 섹션에서 사용) — F1~F4만 허용
app.put("/:id/transfer", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1", "F2", "F3", "F4"]);
  if (denied) return denied;

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

export default app;
