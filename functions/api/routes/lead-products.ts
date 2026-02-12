import { Hono } from "hono";
import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import type { Env } from "../middleware/auth";
import { requireSecurityLevel } from "../middleware/auth";
import { safeError } from "../middleware/helpers";

const app = new Hono<{ Bindings: Env }>();

// GET / - 상품 목록 (all=true 시 비활성 포함)
app.get("/", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const all = c.req.query("all") === "true";

  try {
    let query = supabase
      .from("lead_products")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (!all) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;
    if (error) return safeError(c, error);

    const products = (data || []).map((p: any) => ({
      id: p.id,
      dbType: p.db_type,
      name: p.name,
      price: p.price,
      description: p.description,
      isActive: p.is_active,
      sortOrder: p.sort_order,
    }));

    return c.json(products);
  } catch (err) {
    return safeError(c, err);
  }
});

// POST / - 상품 생성 (F1)
app.post("/", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();
  const { dbType, name, price, description, isActive, sortOrder } = body;

  if (!dbType || !name || price === undefined) {
    return c.json({ error: "dbType, name, price는 필수입니다." }, 400);
  }

  try {
    const { data, error } = await supabase
      .from("lead_products")
      .insert({
        db_type: dbType,
        name,
        price,
        description: description || null,
        is_active: isActive ?? true,
        sort_order: sortOrder || 0,
      })
      .select()
      .single();

    if (error) return safeError(c, error);

    return c.json({
      id: data.id,
      dbType: (data as any).db_type,
      name: (data as any).name,
      price: (data as any).price,
      description: (data as any).description,
      isActive: (data as any).is_active,
      sortOrder: (data as any).sort_order,
    }, 201);
  } catch (err) {
    return safeError(c, err);
  }
});

// PUT /:id - 상품 수정 (F1)
app.put("/:id", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = parseInt(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "유효하지 않은 ID" }, 400);

  const body = await c.req.json();

  try {
    const updateData: any = { updated_at: new Date().toISOString() };
    if (body.dbType !== undefined) updateData.db_type = body.dbType;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.price !== undefined) updateData.price = body.price;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.isActive !== undefined) updateData.is_active = body.isActive;
    if (body.sortOrder !== undefined) updateData.sort_order = body.sortOrder;

    const { data, error } = await supabase
      .from("lead_products")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) return safeError(c, error);

    return c.json({
      id: data.id,
      dbType: (data as any).db_type,
      name: (data as any).name,
      price: (data as any).price,
      description: (data as any).description,
      isActive: (data as any).is_active,
      sortOrder: (data as any).sort_order,
    });
  } catch (err) {
    return safeError(c, err);
  }
});

// DELETE /:id - 상품 삭제 (F1, 주문이 없는 경우만)
app.delete("/:id", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = parseInt(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "유효하지 않은 ID" }, 400);

  try {
    // 주문 아이템에 참조된 상품은 삭제 불가
    const { count } = await supabase
      .from("lead_order_items")
      .select("id", { count: "exact", head: true })
      .eq("product_id", id);

    if (count && count > 0) {
      return c.json({ error: `해당 상품에 ${count}건의 주문이 있어 삭제할 수 없습니다. 비활성으로 변경해주세요.` }, 400);
    }

    const { error } = await supabase
      .from("lead_products")
      .delete()
      .eq("id", id);

    if (error) return safeError(c, error);
    return c.json({ success: true });
  } catch (err) {
    return safeError(c, err);
  }
});

export default app;
