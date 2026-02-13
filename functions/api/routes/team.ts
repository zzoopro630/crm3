import { Hono } from "hono";
import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import type { Env } from "../middleware/auth";
import { getAuthEmployee } from "../middleware/auth";
import { safeError } from "../middleware/helpers";

const app = new Hono<{ Bindings: Env }>();

app.post("/members", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const emp = await getAuthEmployee(c);
  if (!emp) return c.json({ error: "사원 정보를 찾을 수 없습니다." }, 403);

  let employeeIds: string[] = [emp.id];

  if (emp.security_level === "F1") {
    const { data: allEmployees, error } = await supabase
      .from("employees")
      .select("id")
      .eq("is_active", true);

    if (error) {
      return safeError(c, error);
    }
    employeeIds = (allEmployees || []).map((e: any) => e.id);
  }

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

app.post("/stats", async (c) => {
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

export default app;
