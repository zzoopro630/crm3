import { Hono } from "hono";
import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import type { Env } from "../middleware/auth";
import { getAuthEmployee, requireSecurityLevel } from "../middleware/auth";
import { safeError } from "../middleware/helpers";

const DEFAULT_MENU_ROLES: Record<string, Record<string, string>> = {
  "/":                          { F1:"editor",F2:"editor",F3:"editor",F4:"editor",F5:"editor",M1:"editor",M2:"editor",M3:"editor" },
  "/customers":                 { F1:"editor",F2:"editor",F3:"editor",F4:"editor",F5:"editor",M1:"none",M2:"none",M3:"none" },
  "/customers/trash":           { F1:"editor",F2:"editor",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
  "/inquiries":                 { F1:"editor",F2:"editor",F3:"editor",F4:"editor",F5:"viewer",M1:"editor",M2:"editor",M3:"viewer" },
  "/consultant-inquiries":      { F1:"editor",F2:"editor",F3:"editor",F4:"editor",F5:"viewer",M1:"editor",M2:"editor",M3:"viewer" },
  "/recruit-inquiries":         { F1:"editor",F2:"editor",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"none",M3:"none" },
  "/team":                      { F1:"editor",F2:"editor",F3:"editor",F4:"editor",F5:"viewer",M1:"editor",M2:"viewer",M3:"viewer" },
  "/contacts-direct":           { F1:"editor",F2:"editor",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
  "/ads/ndata":                 { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"viewer",M3:"none" },
  "/ads/powerlink":             { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"viewer",M3:"none" },
  "/ads/report":                { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"viewer",M3:"none" },
  "/ads/weekly":                { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"viewer",M3:"none" },
  "/ads/rank-dashboard":        { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"viewer",M3:"none" },
  "/ads/rank-keywords":         { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"viewer",M3:"none" },
  "/ads/rank-urls":             { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"viewer",M3:"none" },
  "/ads/rank-history":          { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"viewer",M3:"none" },
  "/settings/organizations":    { F1:"editor",F2:"viewer",F3:"viewer",F4:"viewer",F5:"viewer",M1:"none",M2:"none",M3:"none" },
  "/settings/labels":           { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
  "/settings/app-settings":     { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
  "/settings/menu-permissions": { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
  "/settings/board-categories": { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
  "/settings/pages":            { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
  "/settings/employees":        { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
  "/settings/approvals":        { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
};

const BOARD_DEFAULT_ROLE: Record<string, string> = { F1:"editor",F2:"viewer",F3:"viewer",F4:"viewer",F5:"viewer",M1:"viewer",M2:"viewer",M3:"viewer" };
const PAGE_DEFAULT_ROLE: Record<string, string> = { F1:"editor",F2:"viewer",F3:"viewer",F4:"viewer",F5:"viewer",M1:"viewer",M2:"viewer",M3:"viewer" };

async function getMenuRoleMap(c: any): Promise<Record<string, string>> {
  const emp = await getAuthEmployee(c);
  if (!emp) return {};

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;

  const { data: boardCats } = await supabase
    .from("board_categories")
    .select("slug")
    .eq("is_active", true);

  const { data: publishedPages } = await supabase
    .from("pages")
    .select("slug")
    .eq("is_published", true);

  if (emp.security_level === "F1") {
    const result: Record<string, string> = {};
    for (const path of Object.keys(DEFAULT_MENU_ROLES)) {
      result[path] = "editor";
    }
    result["/settings/pages"] = "editor";
    if (boardCats) {
      for (const cat of boardCats) {
        result[`/board/${cat.slug}`] = "editor";
      }
    }
    if (publishedPages) {
      for (const p of publishedPages) {
        result[`/page/${p.slug}`] = "editor";
      }
    }
    return result;
  }

  const level = emp.security_level;

  const { data: settings } = await supabase
    .from("app_settings")
    .select("key, value")
    .like("key", "menu_role:%");

  const roleMap: Record<string, string> = {};
  for (const path of Object.keys(DEFAULT_MENU_ROLES)) {
    roleMap[path] = DEFAULT_MENU_ROLES[path]?.[level] || "none";
  }

  if (boardCats) {
    for (const cat of boardCats) {
      roleMap[`/board/${cat.slug}`] = BOARD_DEFAULT_ROLE[level] || "none";
    }
  }

  if (publishedPages) {
    for (const p of publishedPages) {
      roleMap[`/page/${p.slug}`] = PAGE_DEFAULT_ROLE[level] || "none";
    }
  }

  if (settings) {
    for (const s of settings) {
      const menuPath = s.key.replace("menu_role:", "");
      try {
        const parsed = JSON.parse(s.value || "{}");
        if (parsed[level] !== undefined) {
          roleMap[menuPath] = parsed[level];
        }
      } catch { /* ignore */ }
    }
  }

  const { data: overrides } = await supabase
    .from("employee_menu_overrides")
    .select("menu_path, role")
    .eq("employee_id", emp.id);

  if (overrides) {
    for (const o of overrides) {
      roleMap[o.menu_path] = o.role;
    }
  }

  return roleMap;
}

// 메뉴 권한 라우트
export const menuRoleRoutes = new Hono<{ Bindings: Env }>();

menuRoleRoutes.get("/me", async (c) => {
  try {
    const roleMap = await getMenuRoleMap(c);
    return c.json(roleMap);
  } catch (err) {
    return safeError(c, err);
  }
});

// 메뉴 오버라이드 라우트
export const menuOverrideRoutes = new Hono<{ Bindings: Env }>();

menuOverrideRoutes.get("/", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const employeeId = c.req.query("employeeId");
  if (!employeeId) {
    return c.json({ error: "employeeId 파라미터가 필요합니다." }, 400);
  }

  const { data, error } = await supabase
    .from("employee_menu_overrides")
    .select("menu_path, role")
    .eq("employee_id", employeeId);

  if (error) return safeError(c, error);
  return c.json((data || []).map((o: any) => ({ menuPath: o.menu_path, role: o.role })));
});

menuOverrideRoutes.put("/", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();
  const { employeeId, overrides } = body as {
    employeeId: string;
    overrides: Array<{ menuPath: string; role: string }>;
  };

  if (!employeeId || !Array.isArray(overrides)) {
    return c.json({ error: "employeeId와 overrides 배열이 필요합니다." }, 400);
  }

  const { error: delError } = await supabase
    .from("employee_menu_overrides")
    .delete()
    .eq("employee_id", employeeId);

  if (delError) return safeError(c, delError);

  const toInsert = overrides
    .filter((o) => o.role && o.menuPath)
    .map((o) => ({
      employee_id: employeeId,
      menu_path: o.menuPath,
      role: o.role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

  if (toInsert.length > 0) {
    const { error: insError } = await supabase
      .from("employee_menu_overrides")
      .insert(toInsert);

    if (insError) return safeError(c, insError);
  }

  return c.json({ success: true });
});
