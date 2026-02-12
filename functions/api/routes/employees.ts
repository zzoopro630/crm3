import { Hono } from "hono";
import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import type { Env } from "../middleware/auth";
import { getAuthEmployee, requireSecurityLevel } from "../middleware/auth";
import { safeError } from "../middleware/helpers";

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;

  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) {
    return safeError(c, error);
  }

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

app.get("/email/:email", async (c) => {
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

app.post("/", async (c) => {
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

app.put("/:id", async (c) => {
  const emp = await getAuthEmployee(c);
  if (!emp) return c.json({ error: "사원 정보를 찾을 수 없습니다." }, 403);

  const id = c.req.param("id");
  const isSelf = emp.id === id;
  const isF1 = emp.security_level === "F1";

  if (!isF1 && !isSelf) {
    return c.json({ error: "권한이 부족합니다." }, 403);
  }

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();

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

  if (body.fullName !== undefined) updateData.full_name = body.fullName;
  if (body.positionName !== undefined)
    updateData.position_name = body.positionName;
  if (body.department !== undefined) updateData.department = body.department;

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

app.delete("/:id", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");

  const { error } = await supabase
    .from("employees")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return safeError(c, error);
  }

  return c.json({ success: true });
});

app.put("/:id/restore", async (c) => {
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

app.delete("/:id/permanent", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");

  const { data: employee } = await supabase
    .from("employees")
    .select("is_active, full_name")
    .eq("id", id)
    .single();

  if (employee?.is_active) {
    return c.json({ error: "활성 사원은 완전 삭제할 수 없습니다" }, 400);
  }

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

export default app;
