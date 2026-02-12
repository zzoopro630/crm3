import { Hono } from "hono";
import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import type { Env } from "../middleware/auth";

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
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
    customers.forEach((customer: any) => {
      const status = customer.status as keyof typeof statusCounts;
      if (status in statusCounts) {
        statusCounts[status]++;
      }
    });
  }

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
      managersMap = Object.fromEntries(
        managers.map((m: any) => [m.id, m.full_name])
      );
    }
  }

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

export default app;
