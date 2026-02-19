import { Hono } from "hono";
import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import type { Env } from "../middleware/auth";
import { requireSecurityLevel } from "../middleware/auth";
import { safeError } from "../middleware/helpers";

const app = new Hono<{ Bindings: Env }>();

// 키워드 상세 데이터 조회 (페이지네이션으로 전체 데이터 반환)
app.get("/keyword-details", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const startDate = c.req.query("startDate") || "";
  const endDate = c.req.query("endDate") || "";

  const PAGE_SIZE = 1000;
  let allData: any[] = [];
  let from = 0;

  while (true) {
    let query = (supabase as any)
      .schema("marketing")
      .from("keyword_details")
      .select("*")
      .order("report_date", { ascending: false })
      .order("total_cost", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (startDate && endDate) {
      query = query.gte("report_date", startDate).lte("report_date", endDate);
    }

    const { data, error } = await query;
    if (error) return safeError(c, error);
    if (!data || data.length === 0) break;

    allData = allData.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const formattedData = allData.map((item: any) => ({
    id: item.id,
    adGroup: item.ad_group,
    keyword: item.keyword,
    reportDate: item.report_date,
    impressions: item.impressions,
    clicks: item.clicks,
    clickRate: item.click_rate,
    avgCpc: item.avg_cpc,
    totalCost: item.total_cost,
    avgPosition: item.avg_position,
    createdAt: item.created_at,
  }));

  return c.json({ success: true, data: formattedData });
});

// CSV 데이터 저장 (upsert) - F1 전용
app.post("/keyword-details", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();

  const dbData = body.map((item: any) => ({
    ad_group: item.adGroup,
    keyword: item.keyword,
    report_date: item.reportDate,
    impressions: item.impressions,
    clicks: item.clicks,
    click_rate: item.clickRate,
    avg_cpc: item.avgCpc,
    total_cost: item.totalCost,
    avg_position: item.avgPosition,
  }));

  const { error } = await (supabase as any)
    .schema("marketing")
    .from("keyword_details")
    .upsert(dbData, { onConflict: "ad_group,keyword,report_date", ignoreDuplicates: false });

  if (error) return safeError(c, error);
  return c.json({ success: true, count: body.length });
});

// 키워드 상세 데이터 삭제 (날짜 범위) - F1 전용
app.delete("/keyword-details", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  if (!startDate || !endDate) {
    return c.json({ error: "startDate and endDate are required" }, 400);
  }

  const { data, error } = await (supabase as any)
    .schema("marketing")
    .from("keyword_details")
    .delete()
    .gte("report_date", startDate)
    .lte("report_date", endDate)
    .select("id");

  if (error) return safeError(c, error);
  return c.json({ success: true, deletedCount: data?.length || 0 });
});

// 문의 목록 조회
app.get("/inquiries", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const startDate = c.req.query("startDate") || "";
  const endDate = c.req.query("endDate") || "";

  let query = (supabase as any)
    .schema("marketing")
    .from("inquiries")
    .select("*")
    .eq("utm_campaign", "powerContents")
    .order("inquiry_date", { ascending: false });

  if (startDate && endDate) {
    const kstStart = `${startDate}T00:00:00+09:00`;
    const nextDay = new Date(new Date(endDate).getTime() + 86400000).toISOString().split("T")[0];
    const kstEnd = `${nextDay}T00:00:00+09:00`;
    query = query.gte("inquiry_date", kstStart).lt("inquiry_date", kstEnd);
  }

  const { data, error } = await query;
  if (error) return safeError(c, error);

  const formattedData = (data || []).map((item: any) => ({
    id: item.id,
    customerName: item.customer_name,
    phone: item.phone,
    productName: item.product_name,
    utmCampaign: item.utm_campaign,
    sourceUrl: item.source_url,
    inquiryDate: item.inquiry_date,
    createdAt: item.created_at,
  }));

  return c.json({ success: true, data: formattedData });
});

// 수동 문의 입력 - F1 전용
app.post("/inquiries", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();

  const rows = (Array.isArray(body) ? body : [body]).map((item: any) => ({
    customer_name: item.customer_name,
    phone: item.phone,
    product_name: item.product_name,
    utm_campaign: item.utm_campaign,
    source_url: item.source_url,
    inquiry_date: item.inquiry_date,
  }));

  const { error } = await (supabase as any)
    .schema("marketing")
    .from("inquiries")
    .insert(rows);

  if (error) return safeError(c, error);
  return c.json({ success: true });
});

// GA 요약 데이터 조회 (DB 캐시)
app.get("/ga-summary", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const startDate = c.req.query("startDate") || "";
  const endDate = c.req.query("endDate") || "";

  const { data, error } = await (supabase as any)
    .schema("marketing")
    .from("ga_summary")
    .select("*")
    .gte("report_date", startDate)
    .lte("report_date", endDate);

  if (error) return safeError(c, error);

  if (!data || data.length === 0) {
    return c.json({ success: true, data: [], fromDb: false });
  }

  const aggregated: Record<string, any> = {};
  for (const item of data) {
    const key = item.insurance_name;
    if (!aggregated[key]) {
      aggregated[key] = { insuranceName: key, sessions: 0, keyEvents: 0, activeUsers: 0, landingDbRate: 0 };
    }
    aggregated[key].sessions += item.sessions;
    aggregated[key].keyEvents += item.key_events;
    aggregated[key].activeUsers += item.active_users;
  }

  const formattedData = Object.values(aggregated).map((item: any) => ({
    ...item,
    landingDbRate: item.sessions > 0 ? Math.round((item.keyEvents / item.sessions) * 10000) / 100 : 0,
  }));

  return c.json({ success: true, data: formattedData, fromDb: true });
});

// GA 요약 데이터 저장 - F1 전용
app.post("/ga-summary", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const { data: bodyData, reportDate } = await c.req.json();

  if (!bodyData || bodyData.length === 0) {
    return c.json({ success: true, count: 0 });
  }

  const validData = bodyData.filter((item: any) => item.insuranceName && item.insuranceName.trim() !== "");
  if (validData.length === 0) return c.json({ success: true, count: 0 });

  const dbData = validData.map((item: any) => ({
    insurance_name: item.insuranceName.trim(),
    sessions: item.sessions || 0,
    key_events: item.keyEvents || 0,
    active_users: item.activeUsers || 0,
    landing_db_rate: item.landingDbRate || 0,
    report_date: reportDate,
  }));

  const { error } = await (supabase as any)
    .schema("marketing")
    .from("ga_summary")
    .upsert(dbData, { onConflict: "insurance_name,report_date", ignoreDuplicates: false });

  if (error) return safeError(c, error);
  return c.json({ success: true, count: bodyData.length });
});

// GA 전체 세션 데이터 조회 (DB 캐시)
app.get("/ga-totals", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const startDate = c.req.query("startDate") || "";
  const endDate = c.req.query("endDate") || "";

  const { data, error } = await (supabase as any)
    .schema("marketing")
    .from("ga_totals")
    .select("*")
    .gte("report_date", startDate)
    .lte("report_date", endDate);

  if (error) return safeError(c, error);

  if (!data || data.length === 0) {
    return c.json({ success: true, totals: null, fromDb: false });
  }

  const totals = data.reduce(
    (acc: any, item: any) => ({
      sessions: acc.sessions + item.sessions,
      conversions: acc.conversions + item.conversions,
      activeUsers: acc.activeUsers + item.active_users,
    }),
    { sessions: 0, conversions: 0, activeUsers: 0 },
  );

  return c.json({ success: true, totals, fromDb: true });
});

// GA 전체 세션 데이터 저장 - F1 전용
app.post("/ga-totals", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const { totals, reportDate } = await c.req.json();

  if (!totals || (totals.sessions === 0 && totals.conversions === 0)) {
    return c.json({ success: true });
  }

  const dbData = {
    sessions: totals.sessions,
    conversions: totals.conversions,
    active_users: totals.activeUsers,
    report_date: reportDate,
  };

  const { error } = await (supabase as any)
    .schema("marketing")
    .from("ga_totals")
    .upsert(dbData, { onConflict: "report_date", ignoreDuplicates: false });

  if (error) return safeError(c, error);
  return c.json({ success: true });
});

// GA Edge Function 프록시: Summary
app.post("/ga/edge-summary", async (c) => {
  try {
    const body = await c.req.json();
    const fnUrl = `${c.env.SUPABASE_URL}/functions/v1/google-analytics/summary`;

    const res = await fetch(fnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: c.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${c.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[GA Edge] summary error:", res.status, errText);
      return c.json({ success: false, count: 0, data: [] });
    }

    const data = await res.json();
    return c.json(data as Record<string, unknown>);
  } catch (err: unknown) {
    console.error("[GA Edge] summary exception:", (err as Error).message);
    return c.json({ success: false, count: 0, data: [] });
  }
});

// GA Edge Function 프록시: Total Sessions
app.post("/ga/edge-total-sessions", async (c) => {
  try {
    const body = await c.req.json();
    const fnUrl = `${c.env.SUPABASE_URL}/functions/v1/google-analytics/total-sessions`;

    const res = await fetch(fnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: c.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${c.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[GA Edge] total-sessions error:", res.status, errText);
      return c.json({ success: false, totals: null });
    }

    const data = await res.json();
    return c.json(data as Record<string, unknown>);
  } catch (err: unknown) {
    console.error("[GA Edge] total-sessions exception:", (err as Error).message);
    return c.json({ success: false, totals: null });
  }
});

export default app;
