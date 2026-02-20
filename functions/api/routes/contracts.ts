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
    .from("contracts")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    return safeError(c, error);
  }

  const creatorIds = [...new Set((data || []).map((r: any) => r.created_by).filter(Boolean))];
  const creatorsMap: Record<string, string> = {};
  if (creatorIds.length > 0) {
    const { data: creators } = await supabase
      .from("employees")
      .select("id, full_name")
      .in("id", creatorIds);
    if (creators) {
      for (const c2 of creators) creatorsMap[c2.id] = c2.full_name;
    }
  }

  const contracts = (data || []).map((row: any) => ({
    id: row.id,
    customerId: row.customer_id,
    insuranceCompany: row.insurance_company,
    productName: row.product_name,
    premium: row.premium,
    paymentPeriod: row.payment_period,
    memo: row.memo,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    authorName: creatorsMap[row.created_by] || "알 수 없음",
  }));

  return c.json(contracts);
});

app.post("/", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const emp = await getAuthEmployee(c);
  if (!emp) return c.json({ error: "사원 정보를 찾을 수 없습니다." }, 403);
  const body = await c.req.json();

  const { data, error } = await supabase
    .from("contracts")
    .insert({
      customer_id: body.customerId,
      insurance_company: body.insuranceCompany,
      product_name: body.productName,
      premium: body.premium,
      payment_period: body.paymentPeriod,
      memo: body.memo,
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
  const emp = await getAuthEmployee(c);
  if (!emp) return c.json({ error: "사원 정보를 찾을 수 없습니다." }, 403);

  const id = c.req.param("id");

  // 작성자 본인 또는 F1만 수정 가능
  const { data: existing } = await supabase
    .from("contracts")
    .select("created_by")
    .eq("id", id)
    .single();
  if (!existing) return c.json({ error: "계약을 찾을 수 없습니다." }, 404);
  if (emp.security_level !== "F1" && existing.created_by !== emp.id) {
    return c.json({ error: "본인이 작성한 계약만 수정할 수 있습니다." }, 403);
  }

  const body = await c.req.json();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.insuranceCompany !== undefined)
    updateData.insurance_company = body.insuranceCompany;
  if (body.productName !== undefined)
    updateData.product_name = body.productName;
  if (body.premium !== undefined) updateData.premium = body.premium;
  if (body.paymentPeriod !== undefined)
    updateData.payment_period = body.paymentPeriod;
  if (body.memo !== undefined) updateData.memo = body.memo;

  const { data, error } = await supabase
    .from("contracts")
    .update(updateData)
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
  const emp = await getAuthEmployee(c);
  if (!emp) return c.json({ error: "사원 정보를 찾을 수 없습니다." }, 403);

  const id = c.req.param("id");

  // 작성자 본인 또는 F1만 삭제 가능
  const { data: existing } = await supabase
    .from("contracts")
    .select("created_by")
    .eq("id", id)
    .single();
  if (!existing) return c.json({ error: "계약을 찾을 수 없습니다." }, 404);
  if (emp.security_level !== "F1" && existing.created_by !== emp.id) {
    return c.json({ error: "본인이 작성한 계약만 삭제할 수 있습니다." }, 403);
  }

  const { error } = await supabase.from("contracts").delete().eq("id", id);

  if (error) {
    return safeError(c, error);
  }

  return c.json({ success: true });
});

export default app;
