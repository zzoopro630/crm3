// Supabase Edge Function: WordPress CF7 입사문의 Webhook Handler
import { Hono } from "https://deno.land/x/hono@v3.12.0/mod.ts";
import { cors } from "https://deno.land/x/hono@v3.12.0/middleware.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.22.4";

const app = new Hono().basePath("/webhook-recruit");

// Supabase 클라이언트 초기화
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseKey);

// --- 보안 헬퍼 ---

function verifyWebhookSecret(c: any): boolean {
  const secret = Deno.env.get("WEBHOOK_SECRET");
  if (!secret) return false; // 시크릿 미설정 시 차단 (보안 기본값)
  const auth = c.req.header("Authorization") || "";
  return auth === `Bearer ${secret}`;
}

function stripHtml(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/<[^>]*>/g, "").trim();
}

function maskPii(body: Record<string, unknown>): Record<string, unknown> {
  const masked = { ...body };
  if (masked.phone) masked.phone = "***masked***";
  if (masked.birthday) masked.birthday = "***masked***";
  return masked;
}

// Rate limiter (IP당 분당 요청 수 제한)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

// 입력 검증 스키마
const recruitSchema = z.object({
  name: z.string().max(100).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  age: z.string().max(20).optional().nullable(),
  area: z.string().max(100).optional().nullable(),
  career: z.string().max(200).optional().nullable(),
  request: z.string().max(5000).optional().nullable(),
  referer_page: z.string().max(2000).optional().nullable(),
  utm_campaign: z.string().max(500).optional().nullable(),
  source_url: z.string().max(2000).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

// CORS 설정
const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").filter(Boolean);
app.use(
  "/*",
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : "*",
    allowMethods: ["POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "apikey"],
  }),
);

// 헬스체크
app.get("/health", (c) => c.json({ status: "ok" }));

// Webhook 수신 엔드포인트
app.post("/", async (c) => {
  try {
    // P0-1: Webhook Secret 인증
    if (!verifyWebhookSecret(c)) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // P1-2: Rate Limiting
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim()
             || c.req.header("cf-connecting-ip")
             || "unknown";
    if (!checkRateLimit(ip)) {
      return c.json({ error: "Too many requests" }, 429);
    }

    const rawBody = await c.req.json();

    // P2-2: PII 마스킹 로그
    console.log("Received recruit inquiry:", maskPii(rawBody));

    // P1-1: 입력 검증
    const parsed = recruitSchema.safeParse(rawBody);
    if (!parsed.success) {
      console.warn("Validation failed:", parsed.error.flatten());
      return c.json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, 400);
    }

    // HTML 태그 제거
    const name = stripHtml(parsed.data.name);
    const phone = stripHtml(parsed.data.phone);
    const age = stripHtml(parsed.data.age);
    const area = stripHtml(parsed.data.area);
    const career = stripHtml(parsed.data.career);
    const request = stripHtml(parsed.data.request);
    const referer_page = parsed.data.referer_page?.trim() || null;
    const utm_campaign = stripHtml(parsed.data.utm_campaign);
    const source_url = parsed.data.source_url?.trim() || null;
    const date = parsed.data.date || null;

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
    console.error("Webhook Error:", error.message);
    return c.json({ error: "Internal server error" }, 500);
  }
});

Deno.serve(app.fetch);
