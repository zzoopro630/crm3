import { Hono } from "hono";
import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import type { Env } from "../middleware/auth";
import { getAuthEmployee, requireSecurityLevel } from "../middleware/auth";
import { safeError } from "../middleware/helpers";

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;

  try {
    const { data, error } = await supabase
      .from("dashboard_cards")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) return safeError(c, error);
    return c.json(data);
  } catch (err) {
    return safeError(c, err);
  }
});

app.post("/", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const emp = await getAuthEmployee(c);
  if (!emp) return c.json({ error: "사원 정보를 찾을 수 없습니다." }, 403);

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();

  try {
    const { data, error } = await supabase
      .from("dashboard_cards")
      .insert({
        title: body.title,
        description: body.description || "",
        image_url: body.imageUrl || null,
        link_url: body.linkUrl || null,
        sort_order: body.sortOrder || 0,
        created_by: emp.id,
      })
      .select()
      .single();

    if (error) return safeError(c, error);
    return c.json(data, 201);
  } catch (err) {
    return safeError(c, err);
  }
});

app.put("/reorder", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();
  const ids: number[] = body.ids;

  if (!Array.isArray(ids) || ids.length === 0) {
    return c.json({ error: "ids 배열이 필요합니다." }, 400);
  }

  try {
    const updates = ids.map((id, index) =>
      supabase
        .from("dashboard_cards")
        .update({ sort_order: index, updated_at: new Date().toISOString() })
        .eq("id", id)
    );
    await Promise.all(updates);
    return c.json({ success: true });
  } catch (err) {
    return safeError(c, err);
  }
});

app.put("/:id", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = parseInt(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "유효하지 않은 ID" }, 400);
  const body = await c.req.json();

  try {
    const updateData: any = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.imageUrl !== undefined) updateData.image_url = body.imageUrl;
    if (body.linkUrl !== undefined) updateData.link_url = body.linkUrl;
    if (body.sortOrder !== undefined) updateData.sort_order = body.sortOrder;

    const { data, error } = await supabase
      .from("dashboard_cards")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) return safeError(c, error);
    return c.json(data);
  } catch (err) {
    return safeError(c, err);
  }
});

app.delete("/:id", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = parseInt(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "유효하지 않은 ID" }, 400);

  try {
    const { error } = await supabase
      .from("dashboard_cards")
      .delete()
      .eq("id", id);

    if (error) return safeError(c, error);
    return c.json({ success: true });
  } catch (err) {
    return safeError(c, err);
  }
});

export default app;
