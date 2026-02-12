import { Hono } from "hono";
import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import type { Env } from "../middleware/auth";
import { checkUrlTracking, checkNaverWebRank } from "../../lib/naver-crawler";
import { safeError } from "../middleware/helpers";

function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

const app = new Hono<{ Bindings: Env }>();

// --- Sites ---
app.get("/sites", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const seo = (supabase as any).schema("seo");

  const { data: sites, error } = await seo
    .from("sites")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return safeError(c, error);

  const result = [];
  for (const site of sites || []) {
    const { count } = await seo
      .from("keywords")
      .select("*", { count: "exact", head: true })
      .eq("site_id", site.id);

    result.push({
      ...toCamelCase(site as Record<string, unknown>),
      keywordCount: count || 0,
    });
  }

  return c.json(result);
});

app.post("/sites", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const seo = (supabase as any).schema("seo");
  const { name, url } = await c.req.json();

  if (!name || !url) return c.json({ error: "이름과 URL이 필요합니다." }, 400);

  const { data, error } = await seo
    .from("sites")
    .insert({ name, url })
    .select()
    .single();

  if (error) return safeError(c, error);
  return c.json(toCamelCase(data as Record<string, unknown>), 201);
});

app.put("/sites/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const seo = (supabase as any).schema("seo");
  const id = c.req.param("id");
  const { name, url } = await c.req.json();

  const updateData: Record<string, string> = {};
  if (name) updateData.name = name;
  if (url) updateData.url = url;

  const { data, error } = await seo
    .from("sites")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) return safeError(c, error);
  return c.json(toCamelCase(data as Record<string, unknown>));
});

app.delete("/sites/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const seo = (supabase as any).schema("seo");
  const id = c.req.param("id");

  const { error } = await seo
    .from("sites")
    .delete()
    .eq("id", id);

  if (error) return safeError(c, error);
  return c.json({ message: "삭제되었습니다." });
});

// --- Keywords ---
app.get("/keywords", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const seo = (supabase as any).schema("seo");
  const siteId = c.req.query("siteId");

  let query = seo
    .from("keywords")
    .select("*")
    .order("created_at", { ascending: false });

  if (siteId) {
    query = query.eq("site_id", siteId);
  }

  const { data: keywords, error } = await query;
  if (error) return safeError(c, error);

  const result = [];
  for (const kw of keywords || []) {
    const { data: site } = await seo
      .from("sites")
      .select("name, url")
      .eq("id", kw.site_id)
      .single();

    const { data: latestRanking } = await seo
      .from("rankings")
      .select("rank_position, checked_at")
      .eq("keyword_id", kw.id)
      .order("checked_at", { ascending: false })
      .limit(1)
      .single();

    result.push({
      ...toCamelCase(kw as Record<string, unknown>),
      siteName: site?.name || "",
      siteUrl: site?.url || "",
      latestRank: latestRanking?.rank_position || null,
      lastChecked: latestRanking?.checked_at || null,
    });
  }

  return c.json(result);
});

app.post("/keywords", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const seo = (supabase as any).schema("seo");
  const { keyword, siteId } = await c.req.json();

  if (!keyword || !siteId) return c.json({ error: "키워드와 사이트 ID가 필요합니다." }, 400);

  const { data, error } = await seo
    .from("keywords")
    .insert({ keyword, site_id: siteId })
    .select()
    .single();

  if (error) return safeError(c, error);
  return c.json(toCamelCase(data as Record<string, unknown>), 201);
});

app.delete("/keywords/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const seo = (supabase as any).schema("seo");
  const id = c.req.param("id");

  const { error } = await seo
    .from("keywords")
    .delete()
    .eq("id", id);

  if (error) return safeError(c, error);
  return c.json({ message: "삭제되었습니다." });
});

// --- Rankings ---
app.get("/rankings/dashboard/summary", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const seo = (supabase as any).schema("seo");

  const { count: siteCount } = await seo
    .from("sites")
    .select("*", { count: "exact", head: true });

  const { count: keywordCount } = await seo
    .from("keywords")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const { count: todayChecks } = await seo
    .from("rankings")
    .select("*", { count: "exact", head: true })
    .gte("checked_at", `${today}T00:00:00`)
    .lt("checked_at", `${today}T23:59:59`);

  const { data: keywords } = await seo
    .from("keywords")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const latestRankings = [];
  for (const kw of keywords || []) {
    const { data: site } = await seo
      .from("sites")
      .select("name, url")
      .eq("id", kw.site_id)
      .single();

    const { data: ranking } = await seo
      .from("rankings")
      .select("rank_position, checked_at, result_url, result_title")
      .eq("keyword_id", kw.id)
      .order("checked_at", { ascending: false })
      .limit(1)
      .single();

    latestRankings.push({
      keywordId: kw.id,
      keyword: kw.keyword,
      siteName: site?.name || "",
      siteUrl: site?.url || "",
      rankPosition: ranking?.rank_position || null,
      checkedAt: ranking?.checked_at || null,
      resultUrl: ranking?.result_url || null,
      resultTitle: ranking?.result_title || null,
    });
  }

  return c.json({
    stats: {
      siteCount: siteCount || 0,
      keywordCount: keywordCount || 0,
      todayChecks: todayChecks || 0,
    },
    latestRankings,
  });
});

app.post("/rankings/check", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const seo = (supabase as any).schema("seo");
  const { keywordIds } = await c.req.json();

  if (!keywordIds || !Array.isArray(keywordIds) || keywordIds.length === 0) {
    return c.json({ error: "키워드 ID 배열이 필요합니다." }, 400);
  }

  const results = [];
  for (const keywordId of keywordIds) {
    const { data: kw } = await seo
      .from("keywords")
      .select("*")
      .eq("id", keywordId)
      .single();

    if (!kw) {
      results.push({ keywordId, error: "키워드를 찾을 수 없습니다." });
      continue;
    }

    const { data: site } = await seo
      .from("sites")
      .select("url")
      .eq("id", kw.site_id)
      .single();

    if (!site) {
      results.push({ keywordId, error: "사이트를 찾을 수 없습니다." });
      continue;
    }

    try {
      const crawlResult = await checkNaverWebRank(kw.keyword, site.url);

      await seo
        .from("rankings")
        .insert({
          keyword_id: keywordId,
          rank_position: crawlResult?.rank || null,
          search_type: "view",
          result_url: crawlResult?.url || null,
          result_title: crawlResult?.title || null,
        });

      results.push({
        keywordId,
        keyword: kw.keyword,
        rank: crawlResult?.rank || null,
        url: crawlResult?.url || null,
        title: crawlResult?.title || null,
      });
    } catch (err) {
      results.push({ keywordId, error: String(err) });
    }
  }

  return c.json({ results });
});

// --- URL Tracking ---
app.get("/url-tracking", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const seo = (supabase as any).schema("seo");

  const { data: tracked, error } = await seo
    .from("tracked_urls")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) return safeError(c, error);

  const result = [];
  for (const t of tracked || []) {
    const { data: latestRanking } = await seo
      .from("url_rankings")
      .select("rank_position, section_name, section_rank, is_exposed, section_exists, checked_at")
      .eq("tracked_url_id", t.id)
      .order("checked_at", { ascending: false })
      .limit(1)
      .single();

    result.push({
      ...toCamelCase(t as Record<string, unknown>),
      latestRank: latestRanking?.rank_position || null,
      latestSection: latestRanking?.section_name || null,
      latestSectionRank: latestRanking?.section_rank || null,
      latestIsExposed: latestRanking?.is_exposed ?? null,
      latestSectionExists: latestRanking?.section_exists ?? null,
      lastChecked: latestRanking?.checked_at || null,
    });
  }

  return c.json(result);
});

app.post("/url-tracking", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const seo = (supabase as any).schema("seo");
  const { keyword, targetUrl, section, memo } = await c.req.json();

  if (!keyword || !targetUrl) {
    return c.json({ error: "키워드와 대상 URL은 필수입니다." }, 400);
  }

  const { data, error } = await seo
    .from("tracked_urls")
    .insert({
      keyword,
      target_url: targetUrl,
      section: section || null,
      memo: memo || null,
    })
    .select()
    .single();

  if (error) return safeError(c, error);
  return c.json(toCamelCase(data as Record<string, unknown>), 201);
});

app.delete("/url-tracking/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const seo = (supabase as any).schema("seo");
  const id = c.req.param("id");

  const { error } = await seo
    .from("tracked_urls")
    .delete()
    .eq("id", id);

  if (error) return safeError(c, error);
  return c.json({ message: "삭제되었습니다." });
});

app.put("/url-tracking/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const seo = (supabase as any).schema("seo");
  const id = c.req.param("id");
  const { keyword, targetUrl, section, memo } = await c.req.json();

  const updateData: Record<string, unknown> = {};
  if (keyword !== undefined) updateData.keyword = keyword;
  if (targetUrl !== undefined) updateData.target_url = targetUrl;
  if (section !== undefined) updateData.section = section || null;
  if (memo !== undefined) updateData.memo = memo || null;

  const { data, error } = await seo
    .from("tracked_urls")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) return safeError(c, error);
  return c.json(toCamelCase(data as Record<string, unknown>));
});

app.post("/url-tracking/check", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const seo = (supabase as any).schema("seo");
  const { trackedUrlIds } = await c.req.json();

  if (!trackedUrlIds || !Array.isArray(trackedUrlIds) || trackedUrlIds.length === 0) {
    return c.json({ error: "추적 URL ID 배열이 필요합니다." }, 400);
  }

  const results = [];
  for (const id of trackedUrlIds) {
    const { data: tracked } = await seo
      .from("tracked_urls")
      .select("*")
      .eq("id", id)
      .single();

    if (!tracked) {
      results.push({ trackedUrlId: id, error: "추적 URL을 찾을 수 없습니다." });
      continue;
    }

    try {
      const crawlResult = await checkUrlTracking(
        tracked.keyword,
        tracked.target_url,
        tracked.section || undefined
      );

      await seo
        .from("url_rankings")
        .insert({
          tracked_url_id: id,
          rank_position: crawlResult.overallRank,
          section_name: crawlResult.foundInSection || null,
          section_rank: crawlResult.sectionRank,
          is_exposed: crawlResult.isExposed,
          section_exists: crawlResult.sectionExists,
        });

      results.push({
        trackedUrlId: id,
        keyword: tracked.keyword,
        targetUrl: tracked.target_url,
        isExposed: crawlResult.isExposed,
        sectionExists: crawlResult.sectionExists,
        sectionRank: crawlResult.sectionRank,
        overallRank: crawlResult.overallRank,
        foundInSection: crawlResult.foundInSection,
      });
    } catch (err) {
      results.push({ trackedUrlId: id, error: String(err) });
    }
  }

  return c.json({ results });
});

// --- History ---
app.get("/rankings/history", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const seo = (supabase as any).schema("seo");

  const { startDate, endDate, type } = c.req.query();

  if (!startDate || !endDate || !type) {
    return c.json({ error: "startDate, endDate, type 파라미터가 필요합니다." }, 400);
  }

  if (type === "keyword") {
    const { data: rankings, error } = await seo
      .from("rankings")
      .select("id, keyword_id, rank_position, checked_at, result_url, result_title")
      .gte("checked_at", `${startDate}T00:00:00`)
      .lte("checked_at", `${endDate}T23:59:59`)
      .order("checked_at", { ascending: false })
      .limit(500);

    if (error) return safeError(c, error);

    const result = [];
    for (const r of rankings || []) {
      const { data: kw } = await seo
        .from("keywords")
        .select("keyword, site_id")
        .eq("id", r.keyword_id)
        .single();

      let siteName = "";
      if (kw?.site_id) {
        const { data: site } = await seo
          .from("sites")
          .select("name")
          .eq("id", kw.site_id)
          .single();
        siteName = site?.name || "";
      }

      result.push({
        id: r.id,
        checkedAt: r.checked_at,
        siteName,
        keyword: kw?.keyword || "",
        rankPosition: r.rank_position,
        resultUrl: r.result_url,
        resultTitle: r.result_title,
      });
    }

    return c.json(result);
  } else if (type === "url") {
    const { data: rankings, error } = await seo
      .from("url_rankings")
      .select("id, tracked_url_id, rank_position, section_name, section_rank, checked_at")
      .gte("checked_at", `${startDate}T00:00:00`)
      .lte("checked_at", `${endDate}T23:59:59`)
      .order("checked_at", { ascending: false })
      .limit(500);

    if (error) return safeError(c, error);

    const result = [];
    for (const r of rankings || []) {
      const { data: tracked } = await seo
        .from("tracked_urls")
        .select("keyword, target_url")
        .eq("id", r.tracked_url_id)
        .single();

      result.push({
        id: r.id,
        checkedAt: r.checked_at,
        keyword: tracked?.keyword || "",
        targetUrl: tracked?.target_url || "",
        rankPosition: r.rank_position,
        sectionName: r.section_name,
        sectionRank: r.section_rank,
      });
    }

    return c.json(result);
  }

  return c.json({ error: "type은 keyword 또는 url이어야 합니다." }, 400);
});

export default app;
