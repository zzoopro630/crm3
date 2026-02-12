import { Hono } from "hono";
import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import type { Env } from "../middleware/auth";
import { getAuthEmployee, requireSecurityLevel } from "../middleware/auth";
import { safeError } from "../middleware/helpers";

const app = new Hono<{ Bindings: Env }>();

// GET /api/pages - 목록 (all=true 시 F1만 미게시 포함)
app.get("/", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const all = c.req.query("all") === "true";

  try {
    let query = supabase
      .from("pages")
      .select("*, author:employees!author_id(id, full_name)")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (all) {
      // F1만 미게시 포함 가능
      const emp = await getAuthEmployee(c);
      if (!emp || emp.security_level !== "F1") {
        query = query.eq("is_published", true);
      }
    } else {
      query = query.eq("is_published", true);
    }

    const { data, error } = await query;
    if (error) return safeError(c, error);

    const pages = (data || []).map((p: any) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      content: p.content,
      icon: p.icon,
      sortOrder: p.sort_order,
      isPublished: p.is_published,
      authorId: p.author_id,
      authorName: p.author?.full_name || "",
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    return c.json(pages);
  } catch (err) {
    return safeError(c, err);
  }
});

// GET /api/pages/:slug - 단일 조회
app.get("/:slug", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const slug = c.req.param("slug");

  try {
    const { data: page, error } = await supabase
      .from("pages")
      .select("*, author:employees!author_id(id, full_name)")
      .eq("slug", slug)
      .single();

    if (error || !page) return c.json({ error: "페이지를 찾을 수 없습니다." }, 404);

    // 미게시 페이지는 F1만 조회 가능
    if (!(page as any).is_published) {
      const emp = await getAuthEmployee(c);
      if (!emp || emp.security_level !== "F1") {
        return c.json({ error: "페이지를 찾을 수 없습니다." }, 404);
      }
    }

    return c.json({
      id: page.id,
      slug: (page as any).slug,
      title: (page as any).title,
      content: (page as any).content,
      icon: (page as any).icon,
      sortOrder: (page as any).sort_order,
      isPublished: (page as any).is_published,
      authorId: (page as any).author_id,
      authorName: (page as any).author?.full_name || "",
      createdAt: (page as any).created_at,
      updatedAt: (page as any).updated_at,
    });
  } catch (err) {
    return safeError(c, err);
  }
});

// POST /api/pages - 생성 (F1 전용)
app.post("/", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const emp = await getAuthEmployee(c);
  const body = await c.req.json();
  const { title, slug, content, icon, sortOrder, isPublished } = body;

  if (!title || !slug) {
    return c.json({ error: "제목과 slug는 필수입니다." }, 400);
  }

  try {
    const { data: page, error } = await supabase
      .from("pages")
      .insert({
        title,
        slug,
        content: content || "",
        icon: icon || null,
        sort_order: sortOrder || 0,
        is_published: isPublished ?? false,
        author_id: emp.id,
      })
      .select("*, author:employees!author_id(id, full_name)")
      .single();

    if (error) return safeError(c, error);

    // menu_role 자동 등록
    const defaultRoles = { F1:"editor",F2:"viewer",F3:"viewer",F4:"viewer",F5:"viewer",M1:"viewer",M2:"viewer",M3:"viewer" };
    await supabase.from("app_settings").upsert({
      key: `menu_role:/page/${slug}`,
      value: JSON.stringify(defaultRoles),
    }, { onConflict: "key" });

    return c.json({
      id: page.id,
      slug: (page as any).slug,
      title: (page as any).title,
      content: (page as any).content,
      icon: (page as any).icon,
      sortOrder: (page as any).sort_order,
      isPublished: (page as any).is_published,
      authorId: (page as any).author_id,
      authorName: (page as any).author?.full_name || "",
      createdAt: (page as any).created_at,
      updatedAt: (page as any).updated_at,
    }, 201);
  } catch (err) {
    return safeError(c, err);
  }
});

// PUT /api/pages/:id - 수정 (F1 전용)
app.put("/:id", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = parseInt(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "유효하지 않은 ID" }, 400);

  const body = await c.req.json();
  const { title, slug, content, icon, sortOrder, isPublished } = body;

  try {
    // slug 변경 시 기존 slug 필요
    const { data: oldPage } = await supabase
      .from("pages")
      .select("slug")
      .eq("id", id)
      .single();

    if (!oldPage) return c.json({ error: "페이지를 찾을 수 없습니다." }, 404);

    const updateData: any = { updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) updateData.slug = slug;
    if (content !== undefined) updateData.content = content;
    if (icon !== undefined) updateData.icon = icon;
    if (sortOrder !== undefined) updateData.sort_order = sortOrder;
    if (isPublished !== undefined) updateData.is_published = isPublished;

    const { data: page, error } = await supabase
      .from("pages")
      .update(updateData)
      .eq("id", id)
      .select("*, author:employees!author_id(id, full_name)")
      .single();

    if (error) return safeError(c, error);

    // slug 변경 시 menu_role 키 갱신
    if (slug && slug !== oldPage.slug) {
      const { data: oldSetting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", `menu_role:/page/${oldPage.slug}`)
        .single();

      if (oldSetting) {
        await supabase.from("app_settings").upsert({
          key: `menu_role:/page/${slug}`,
          value: oldSetting.value,
        }, { onConflict: "key" });
        await supabase
          .from("app_settings")
          .delete()
          .eq("key", `menu_role:/page/${oldPage.slug}`);
      }
    }

    return c.json({
      id: page.id,
      slug: (page as any).slug,
      title: (page as any).title,
      content: (page as any).content,
      icon: (page as any).icon,
      sortOrder: (page as any).sort_order,
      isPublished: (page as any).is_published,
      authorId: (page as any).author_id,
      authorName: (page as any).author?.full_name || "",
      createdAt: (page as any).created_at,
      updatedAt: (page as any).updated_at,
    });
  } catch (err) {
    return safeError(c, err);
  }
});

// DELETE /api/pages/:id - 삭제 (F1 전용)
app.delete("/:id", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = parseInt(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "유효하지 않은 ID" }, 400);

  try {
    const { data: page } = await supabase
      .from("pages")
      .select("slug")
      .eq("id", id)
      .single();

    if (!page) return c.json({ error: "페이지를 찾을 수 없습니다." }, 404);

    const { error } = await supabase
      .from("pages")
      .delete()
      .eq("id", id);

    if (error) return safeError(c, error);

    // menu_role 삭제
    await supabase
      .from("app_settings")
      .delete()
      .eq("key", `menu_role:/page/${page.slug}`);

    return c.json({ success: true });
  } catch (err) {
    return safeError(c, err);
  }
});

export default app;
