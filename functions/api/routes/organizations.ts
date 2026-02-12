import { Hono } from "hono";
import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import type { Env } from "../middleware/auth";
import { requireSecurityLevel } from "../middleware/auth";
import { safeError } from "../middleware/helpers";

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return safeError(c, error);
  }

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
      managersMap = Object.fromEntries(
        managers.map((m: any) => [m.id, m.full_name])
      );
    }
  }

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

app.get("/:id", async (c) => {
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

app.post("/", async (c) => {
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

app.put("/:id", async (c) => {
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

app.delete("/:id", async (c) => {
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

export default app;
