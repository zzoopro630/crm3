import { Hono } from "hono";
import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import type { Env } from "../middleware/auth";
import { getAuthEmployee } from "../middleware/auth";
import { safeError } from "../middleware/helpers";

const app = new Hono<{ Bindings: Env }>();

app.get("/:customerId", async (c) => {
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

app.post("/", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const emp = await getAuthEmployee(c);
  if (!emp) return c.json({ error: "사원 정보를 찾을 수 없습니다." }, 403);
  const body = await c.req.json();

  const { data, error } = await supabase
    .from("customer_notes")
    .insert({
      customer_id: body.customerId,
      content: body.content,
      created_by: emp.id,
    })
    .select()
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

app.delete("/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");

  const { error } = await supabase.from("customer_notes").delete().eq("id", id);

  if (error) {
    return safeError(c, error);
  }

  return c.json({ success: true });
});

export default app;
