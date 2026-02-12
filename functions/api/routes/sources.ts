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
    .from("sources")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return safeError(c, error);
  }

  const sources = (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  }));

  return c.json(sources);
});

app.post("/", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();

  const { data, error } = await supabase
    .from("sources")
    .insert({ name: body.name })
    .select()
    .single();

  if (error) {
    return safeError(c, error);
  }

  return c.json(
    { id: data.id, name: data.name, createdAt: data.created_at },
    201
  );
});

app.put("/:id", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");
  const body = await c.req.json();

  const { data, error } = await supabase
    .from("sources")
    .update({ name: body.name })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return safeError(c, error);
  }

  return c.json({ id: data.id, name: data.name, createdAt: data.created_at });
});

app.delete("/:id", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");

  const { error } = await supabase.from("sources").delete().eq("id", id);

  if (error) {
    return safeError(c, error);
  }

  return c.json({ success: true });
});

export default app;
