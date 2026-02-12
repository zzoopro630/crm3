import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  JUSO_API_KEY: string;
  SUPER_ADMIN_EMAIL?: string;
  ENVIRONMENT?: string;
  RESEND_API_KEY?: string;
}

export async function getAuthEmployee(c: any) {
  const cached = c.get("employee" as never);
  if (cached) return cached;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const email = c.get("userEmail" as never) as string;

  const { data } = await supabase
    .from("employees")
    .select("id, security_level, organization_id")
    .eq("email", email)
    .eq("is_active", true)
    .single();

  if (data) c.set("employee" as never, data);
  return data;
}

export async function requireSecurityLevel(c: any, levels: string[]) {
  const emp = await getAuthEmployee(c);
  if (!emp)
    return c.json({ error: "사원 정보를 찾을 수 없습니다." }, 403);
  if (!levels.includes(emp.security_level))
    return c.json({ error: "권한이 부족합니다." }, 403);
  return null;
}

export async function requireBoardEditor(c: any, categorySlug: string) {
  const emp = await getAuthEmployee(c);
  if (!emp) return c.json({ error: "사원 정보를 찾을 수 없습니다." }, 403);
  if (emp.security_level === "F1") return null;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const menuPath = `/board/${categorySlug}`;
  const level = emp.security_level;

  let role = "viewer";

  const { data: setting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", `menu_role:${menuPath}`)
    .maybeSingle();

  if (setting?.value) {
    try {
      const parsed = JSON.parse(setting.value);
      if (parsed[level] !== undefined) role = parsed[level];
    } catch { /* use default */ }
  }

  const { data: override } = await supabase
    .from("employee_menu_overrides")
    .select("role")
    .eq("employee_id", emp.id)
    .eq("menu_path", menuPath)
    .maybeSingle();

  if (override?.role) role = override.role;

  if (role !== "editor") {
    return c.json({ error: "권한이 부족합니다." }, 403);
  }
  return null;
}
