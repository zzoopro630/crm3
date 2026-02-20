// Supabase Edge Function: WordPress CF7 Webhook Handler
import { Hono } from "https://deno.land/x/hono@v3.12.0/mod.ts";
import { cors } from "https://deno.land/x/hono@v3.12.0/middleware.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.22.4";

const app = new Hono().basePath("/webhook-inquiry");

// Supabase 클라이언트 초기화
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseKey);

// --- 보안 헬퍼 ---

function verifyWebhookSecret(c: any): boolean {
  const secret = Deno.env.get("WEBHOOK_SECRET");
  if (!secret) return true; // 시크릿 미설정 시 통과 (마이그레이션 기간)
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
const RATE_LIMIT = 10; // IP당 분당 최대 요청 수
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
const inquirySchema = z.object({
  name: z.string().max(100).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  product: z.string().max(200).optional().nullable(),
  utm_campaign: z.string().max(500).optional().nullable(),
  source_url: z.string().max(2000).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  birthday: z.string().max(20).optional().nullable(),
  sex: z.string().max(10).optional().nullable(),
  request: z.string().max(5000).optional().nullable(),
});

// CORS 설정 — WordPress 도메인만 허용 (서버-서버 호출은 Origin 없이 통과)
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
    console.log("Received inquiry:", maskPii(rawBody));

    // P1-1: 입력 검증
    const parsed = inquirySchema.safeParse(rawBody);
    if (!parsed.success) {
      console.warn("Validation failed:", parsed.error.flatten());
      return c.json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, 400);
    }

    // HTML 태그 제거
    const name = stripHtml(parsed.data.name);
    const phone = stripHtml(parsed.data.phone);
    const product = stripHtml(parsed.data.product);
    const utm_campaign = stripHtml(parsed.data.utm_campaign);
    const source_url = parsed.data.source_url?.trim() || "";
    const date = parsed.data.date || null;
    const birthday = stripHtml(parsed.data.birthday);
    const sex = stripHtml(parsed.data.sex);
    const request = stripHtml(parsed.data.request);

    // 중복 체크: 같은 연락처 + utm_campaign이 10분 이내 제출된 경우
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: existing } = await supabase
      .schema("marketing")
      .from("inquiries")
      .select("id, request")
      .eq("phone", phone || "")
      .eq("utm_campaign", utm_campaign || "")
      .gte("created_at", tenMinutesAgo)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      const newHasRequest = request && request.trim() !== "";

      if (newHasRequest) {
        // 새 요청사항이 있으면 → 기존 데이터 업데이트
        const { error: updateError } = await supabase
          .schema("marketing")
          .from("inquiries")
          .update({ request })
          .eq("id", existing.id);

        if (updateError) {
          console.error("DB Update Error:", updateError);
          throw updateError;
        }

        console.log("Duplicate detected - updated with new request:", existing.id);
        return c.json({
          success: true,
          message: "Duplicate updated with request",
          id: existing.id,
          duplicate: true,
        });
      }

      // 새 요청사항이 없으면 → 무시
      console.log("Duplicate detected - ignored:", existing.id);
      return c.json({
        success: true,
        message: "Duplicate ignored",
        id: existing.id,
        duplicate: true,
      });
    }

    // 신규 저장 (marketing 스키마)
    const { data, error } = await supabase
      .schema("marketing")
      .from("inquiries")
      .insert([
        {
          customer_name: name,
          phone: phone,
          product_name: product,
          utm_campaign: utm_campaign,
          source_url: source_url,
          inquiry_date: date || new Date().toISOString().split("T")[0],
          birthday: birthday || null,
          sex: sex || null,
          request: request || null,
        },
      ])
      .select();

    if (error) {
      console.error("DB Insert Error:", error);
      throw error;
    }

    return c.json({
      success: true,
      message: "Inquiry saved successfully",
      id: data?.[0]?.id,
    });
  } catch (error: any) {
    console.error("Webhook Error:", error.message);
    return c.json({ error: "Internal server error" }, 500);
  }
});

Deno.serve(app.fetch);
