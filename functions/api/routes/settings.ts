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
    .from("app_settings")
    .select("key, value");

  if (error) return safeError(c, error);

  return c.json(
    (data || []).map((row: any) => ({ key: row.key, value: row.value }))
  );
});

app.put("/", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();
  const items = body.items as Array<{ key: string; value: string | null }>;
  const now = new Date().toISOString();

  const toUpsert = items
    .filter((i) => i.value)
    .map((i) => ({ key: i.key, value: i.value!, updated_at: now }));

  const toDeleteKeys = items.filter((i) => !i.value).map((i) => i.key);

  const errors: string[] = [];

  if (toUpsert.length > 0) {
    const { error } = await supabase
      .from("app_settings")
      .upsert(toUpsert, { onConflict: "key" });
    if (error) errors.push(`upsert: ${error.message}`);
  }

  if (toDeleteKeys.length > 0) {
    const { error } = await supabase
      .from("app_settings")
      .delete()
      .in("key", toDeleteKeys);
    if (error) errors.push(`delete: ${error.message}`);
  }

  if (errors.length > 0) {
    return c.json({ error: errors.join("; ") }, 500);
  }
  return c.json({ success: true });
});

export default app;
