import { Hono } from "hono";
import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import type { Env } from "../middleware/auth";
import { requireSecurityLevel } from "../middleware/auth";
import { safeError, parsePagination } from "../middleware/helpers";

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
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
app.get("/trash", async (c) => {
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

app.put("/:id", async (c) => {
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

// 고객 이관 (Team 섹션에서 사용)
app.put("/:id/transfer", async (c) => {
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
