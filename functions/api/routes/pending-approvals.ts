import { Hono } from "hono";
import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import type { Env } from "../middleware/auth";
import { requireSecurityLevel } from "../middleware/auth";
import { safeError } from "../middleware/helpers";

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
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

app.post("/", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();

  const { data: existing } = await supabase
    .from("pending_approvals")
    .select("*")
    .eq("email", body.email)
    .eq("status", "pending")
    .single();

  if (existing) {
    return c.json(existing);
  }

  const superAdminEmail = (c.env as Record<string, string>).SUPER_ADMIN_EMAIL;
  if (superAdminEmail && body.email === superAdminEmail) {
    const { data: existingEmp } = await supabase
      .from("employees")
      .select("*")
      .eq("email", body.email)
      .single();

    if (existingEmp) {
      return c.json(existingEmp);
    }

    const { data: admin, error: adminError } = await supabase
      .from("employees")
      .insert({
        email: body.email,
        full_name: "최고관리자",
        security_level: "F1",
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

app.put("/:id/approve", async (c) => {
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

  const { data: existing } = await supabase
    .from("employees")
    .select("id")
    .eq("email", body.email)
    .single();

  if (existing) {
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

app.put("/:id/reject", async (c) => {
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

export default app;
