import { Hono } from "hono";
import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import type { Env } from "../middleware/auth";
import { getAuthEmployee, requireSecurityLevel, requireBoardEditor } from "../middleware/auth";
import { safeError, parsePagination } from "../middleware/helpers";

// 게시판 카테고리
export const boardCategoryRoutes = new Hono<{ Bindings: Env }>();

boardCategoryRoutes.get("/", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const activeOnly = c.req.query("active") === "true";

  try {
    let query = supabase
      .from("board_categories")
      .select("*")
      .order("sort_order", { ascending: true });

    if (activeOnly) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) return safeError(c, error);

    const categories = (data || []).map((cat: any) => ({
      id: cat.id,
      slug: cat.slug,
      name: cat.name,
      icon: cat.icon,
      sortOrder: cat.sort_order,
      displayType: cat.display_type || "table",
      isActive: cat.is_active,
    }));

    return c.json(categories);
  } catch (err) {
    return safeError(c, err);
  }
});

boardCategoryRoutes.post("/", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();
  const { name, slug, icon, sortOrder } = body;

  if (!name || !slug) {
    return c.json({ error: "이름과 slug는 필수입니다." }, 400);
  }

  try {
    const { data: cat, error } = await supabase
      .from("board_categories")
      .insert({
        name,
        slug,
        icon: icon || null,
        sort_order: sortOrder || 0,
      })
      .select()
      .single();

    if (error) return safeError(c, error);

    const defaultRoles = { F1:"editor",F2:"viewer",F3:"viewer",F4:"viewer",F5:"viewer",M1:"viewer",M2:"viewer",M3:"viewer" };
    await supabase.from("app_settings").upsert({
      key: `menu_role:/board/${slug}`,
      value: JSON.stringify(defaultRoles),
    }, { onConflict: "key" });

    return c.json({
      id: cat.id,
      slug: cat.slug,
      name: cat.name,
      icon: cat.icon,
      sortOrder: cat.sort_order,
      isActive: cat.is_active,
    }, 201);
  } catch (err) {
    return safeError(c, err);
  }
});

boardCategoryRoutes.put("/:id", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = parseInt(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "유효하지 않은 ID" }, 400);

  const body = await c.req.json();
  const { name, slug, icon, sortOrder, isActive } = body;

  try {
    const { data: oldCat } = await supabase
      .from("board_categories")
      .select("slug")
      .eq("id", id)
      .single();

    if (!oldCat) return c.json({ error: "카테고리를 찾을 수 없습니다." }, 404);

    const updateData: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (icon !== undefined) updateData.icon = icon;
    if (sortOrder !== undefined) updateData.sort_order = sortOrder;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data: cat, error } = await supabase
      .from("board_categories")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) return safeError(c, error);

    if (slug && slug !== oldCat.slug) {
      await supabase
        .from("posts")
        .update({ category: slug })
        .eq("category", oldCat.slug);

      const { data: oldSetting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", `menu_role:/board/${oldCat.slug}`)
        .single();

      if (oldSetting) {
        await supabase.from("app_settings").upsert({
          key: `menu_role:/board/${slug}`,
          value: oldSetting.value,
        }, { onConflict: "key" });
        await supabase
          .from("app_settings")
          .delete()
          .eq("key", `menu_role:/board/${oldCat.slug}`);
      }
    }

    return c.json({
      id: cat.id,
      slug: cat.slug,
      name: cat.name,
      icon: cat.icon,
      sortOrder: cat.sort_order,
      isActive: cat.is_active,
    });
  } catch (err) {
    return safeError(c, err);
  }
});

boardCategoryRoutes.delete("/:id", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = parseInt(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "유효하지 않은 ID" }, 400);

  try {
    const { data: cat } = await supabase
      .from("board_categories")
      .select("slug")
      .eq("id", id)
      .single();

    if (!cat) return c.json({ error: "카테고리를 찾을 수 없습니다." }, 404);

    const { count } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("category", cat.slug)
      .is("deleted_at", null);

    if (count && count > 0) {
      return c.json({ error: `해당 카테고리에 ${count}개의 게시글이 있어 삭제할 수 없습니다.` }, 400);
    }

    const { error } = await supabase
      .from("board_categories")
      .delete()
      .eq("id", id);

    if (error) return safeError(c, error);

    await supabase
      .from("app_settings")
      .delete()
      .eq("key", `menu_role:/board/${cat.slug}`);

    return c.json({ success: true });
  } catch (err) {
    return safeError(c, err);
  }
});

// 게시글
export const postRoutes = new Hono<{ Bindings: Env }>();

postRoutes.get("/", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const { page, limit, offset } = parsePagination(c);
  const category = c.req.query("category") || "";
  const search = c.req.query("search") || "";

  try {
    let query = supabase
      .from("posts")
      .select("*, author:employees!author_id(id, full_name)", { count: "exact" })
      .is("deleted_at", null);

    if (category) query = query.eq("category", category);
    if (search) query = query.ilike("title", `%${search}%`);

    query = query
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) return safeError(c, error);

    const posts = (data || []).map((p: any) => ({
      id: p.id,
      category: p.category,
      title: p.title,
      content: p.content,
      isPinned: p.is_pinned,
      authorId: p.author_id,
      authorName: p.author?.full_name || "",
      viewCount: p.view_count,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    return c.json({
      data: posts,
      total: count || 0,
      page,
      limit,
    });
  } catch (err) {
    return safeError(c, err);
  }
});

postRoutes.get("/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = parseInt(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "유효하지 않은 ID" }, 400);

  try {
    await supabase.rpc("increment_post_view_count" as any, { p_post_id: id });

    const { data: post, error } = await supabase
      .from("posts")
      .select("*, author:employees!author_id(id, full_name)")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error || !post) return c.json({ error: "게시글을 찾을 수 없습니다." }, 404);

    const { data: attachments } = await supabase
      .from("post_attachments")
      .select("*")
      .eq("post_id", id)
      .order("id");

    return c.json({
      id: post.id,
      category: (post as any).category,
      title: (post as any).title,
      content: (post as any).content,
      isPinned: (post as any).is_pinned,
      authorId: (post as any).author_id,
      authorName: (post as any).author?.full_name || "",
      viewCount: (post as any).view_count + 1,
      createdAt: (post as any).created_at,
      updatedAt: (post as any).updated_at,
      attachments: (attachments || []).map((a: any) => ({
        id: a.id,
        fileName: a.file_name,
        fileUrl: a.file_url,
      })),
    });
  } catch (err) {
    return safeError(c, err);
  }
});

postRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const { title, content, category, isPinned, attachments } = body;

  if (!title || !content || !category) {
    return c.json({ error: "제목, 내용, 카테고리는 필수입니다." }, 400);
  }

  const denied = await requireBoardEditor(c, category);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const emp = await getAuthEmployee(c);

  try {
    const { data: post, error } = await supabase
      .from("posts")
      .insert({
        title,
        content,
        category,
        is_pinned: isPinned || false,
        author_id: emp.id,
      })
      .select()
      .single();

    if (error) return safeError(c, error);

    if (attachments?.length > 0) {
      const rows = attachments.map((a: any) => ({
        post_id: post.id,
        file_name: a.fileName,
        file_url: a.fileUrl,
      }));
      await supabase.from("post_attachments").insert(rows);
    }

    return c.json(post, 201);
  } catch (err) {
    return safeError(c, err);
  }
});

postRoutes.put("/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = parseInt(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "유효하지 않은 ID" }, 400);

  const { data: existing } = await supabase
    .from("posts")
    .select("category")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (!existing) return c.json({ error: "게시글을 찾을 수 없습니다." }, 404);

  const denied = await requireBoardEditor(c, existing.category);
  if (denied) return denied;

  const body = await c.req.json();
  const { title, content, isPinned, attachments } = body;

  try {
    const updateData: any = { updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (isPinned !== undefined) updateData.is_pinned = isPinned;

    const { data: post, error } = await supabase
      .from("posts")
      .update(updateData)
      .eq("id", id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return safeError(c, error, 404);

    if (attachments !== undefined) {
      await supabase.from("post_attachments").delete().eq("post_id", id);
      if (attachments.length > 0) {
        const rows = attachments.map((a: any) => ({
          post_id: id,
          file_name: a.fileName,
          file_url: a.fileUrl,
        }));
        await supabase.from("post_attachments").insert(rows);
      }
    }

    return c.json(post);
  } catch (err) {
    return safeError(c, err);
  }
});

postRoutes.delete("/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = parseInt(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "유효하지 않은 ID" }, 400);

  const { data: existing } = await supabase
    .from("posts")
    .select("category")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (!existing) return c.json({ error: "게시글을 찾을 수 없습니다." }, 404);

  const denied = await requireBoardEditor(c, existing.category);
  if (denied) return denied;

  try {
    const { error } = await supabase
      .from("posts")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null);

    if (error) return safeError(c, error);
    return c.json({ success: true });
  } catch (err) {
    return safeError(c, err);
  }
});

postRoutes.post("/cleanup", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;

  try {
    const cutoff = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
    const { data: expired, error: qErr } = await supabase
      .from("posts")
      .select("id, content")
      .not("deleted_at", "is", null)
      .lt("deleted_at", cutoff)
      .limit(50);

    if (qErr) return safeError(c, qErr);
    if (!expired || expired.length === 0) {
      return c.json({ deleted: 0, storageErrors: 0 });
    }

    const ids = expired.map((p: any) => p.id);

    const { data: attachments } = await supabase
      .from("post_attachments")
      .select("file_url")
      .in("post_id", ids);

    const storagePaths: string[] = [];
    const MARKER = "/storage/v1/object/public/post-images/";

    const extractPath = (url: string): string | null => {
      const idx = url.indexOf(MARKER);
      return idx === -1 ? null : url.substring(idx + MARKER.length);
    };

    const extractImageUrls = (content: string): string[] => {
      if (!content) return [];
      try {
        const parsed = JSON.parse(content);
        if (parsed?.images && Array.isArray(parsed.images)) return parsed.images;
      } catch { /* not JSON */ }
      const urls: string[] = [];
      const re = /<img[^>]+src="([^"]*post-images[^"]*)"/g;
      let m;
      while ((m = re.exec(content))) urls.push(m[1]);
      return urls;
    };

    for (const post of expired) {
      for (const url of extractImageUrls(post.content || "")) {
        const p = extractPath(url);
        if (p) storagePaths.push(p);
      }
    }

    for (const att of attachments || []) {
      const p = extractPath((att as any).file_url || "");
      if (p) storagePaths.push(p);
    }

    let storageErrors = 0;
    if (storagePaths.length > 0) {
      const { error: sErr } = await supabase.storage
        .from("post-images")
        .remove(storagePaths);
      if (sErr) storageErrors = storagePaths.length;
    }

    const { error: dErr } = await supabase
      .from("posts")
      .delete()
      .in("id", ids);

    if (dErr) return safeError(c, dErr);

    return c.json({ deleted: ids.length, storageErrors });
  } catch (err) {
    return safeError(c, err);
  }
});
