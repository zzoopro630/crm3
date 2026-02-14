// Supabase Edge Function: WordPress CF7 입사문의 Webhook Handler
import { Hono } from "https://deno.land/x/hono@v3.12.0/mod.ts";
import { cors } from "https://deno.land/x/hono@v3.12.0/middleware.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const app = new Hono().basePath("/webhook-recruit");

// Supabase 클라이언트 초기화
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseKey);

// CORS 설정
app.use(
  "/*",
  cors({
    origin: "*",
    allowMethods: ["POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "apikey"],
  }),
);

// 헬스체크
app.get("/health", (c) => c.json({ status: "ok" }));

// Webhook 수신 엔드포인트
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    console.log("Received recruit inquiry:", body);

    const { name, phone, age, area, career, request,
            referer_page, utm_campaign, source_url, date } = body;

    // 중복 체크: 같은 연락처가 10분 이내 제출된 경우
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: existing } = await supabase
      .schema("marketing")
      .from("recruit_inquiries")
      .select("id")
      .eq("phone", phone || "")
      .gte("created_at", tenMinutesAgo)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      console.log("Recruit duplicate detected - ignored:", existing.id);
      return c.json({
        success: true,
        message: "Duplicate ignored",
        id: existing.id,
        duplicate: true,
      });
    }

    // 신규 저장 (marketing.recruit_inquiries)
    const { data, error } = await supabase
      .schema("marketing")
      .from("recruit_inquiries")
      .insert([{
        customer_name: name,
        phone: phone,
        age: age || null,
        area: area || null,
        career: career || null,
        request: request || null,
        referer_page: referer_page || null,
        utm_campaign: utm_campaign || null,
        source_url: source_url || null,
        inquiry_date: date || new Date().toISOString().split("T")[0],
      }])
      .select();

    if (error) {
      console.error("DB Insert Error:", error);
      throw error;
    }

    return c.json({
      success: true,
      message: "Recruit inquiry saved successfully",
      id: data?.[0]?.id,
    });
  } catch (error: any) {
    console.error("Webhook Error:", error);
    return c.json({ error: error.message }, 500);
  }
});

Deno.serve(app.fetch);
