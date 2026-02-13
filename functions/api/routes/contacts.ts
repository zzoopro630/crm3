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

app.post("/", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;
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

app.put("/:id", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;
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

app.delete("/:id", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");

  const { error } = await supabase
    .from("contacts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return safeError(c, error);
  return c.json({ success: true });
});

app.get("/trash", async (c) => {
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

app.post("/:id/restore", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");

  const { error } = await supabase
    .from("contacts")
    .update({ deleted_at: null })
    .eq("id", id);

  if (error) return safeError(c, error);
  return c.json({ success: true });
});

app.delete("/:id/permanent", async (c) => {
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

app.delete("/trash/empty", async (c) => {
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

app.post("/bulk", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();
  const { contacts, managerNames } = body as {
    contacts: Array<{
      name: string;
      title?: string | null;
      team?: string;
      phone: string;
    }>;
    managerNames: Record<string, string>;
  };

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

export default app;
