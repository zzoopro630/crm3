import { Hono } from "hono";
import { cors } from "hono/cors";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { Env } from "./middleware/auth";

// Route imports
import customers from "./routes/customers";
import contracts from "./routes/contracts";
import notes from "./routes/notes";
import employees from "./routes/employees";
import sources from "./routes/sources";
import dashboard from "./routes/dashboard";
import pendingApprovals from "./routes/pending-approvals";
import organizations from "./routes/organizations";
import team from "./routes/team";
import { inquiryRoutes, consultantInquiryRoutes, recruitInquiryRoutes } from "./routes/inquiries";
import ads from "./routes/ads";
import settings from "./routes/settings";
import address from "./routes/address";
import contacts from "./routes/contacts";
import rank from "./routes/rank";
import { boardCategoryRoutes, postRoutes } from "./routes/board";
import { menuRoleRoutes, menuOverrideRoutes } from "./routes/menu-roles";
import dashboardCards from "./routes/dashboard-cards";
import pages from "./routes/pages";
import leadProducts from "./routes/lead-products";
import leadOrders from "./routes/lead-orders";
import cardOrders from "./routes/card-orders";

// Hono 앱 생성
const app = new Hono<{ Bindings: Env }>();

// CORS 설정
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "https://crm3.pages.dev", "https://crm.thefirst.co.kr"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Supabase 클라이언트 미들웨어
app.use("*", async (c, next) => {
  const supabase = createClient<Database>(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_SERVICE_ROLE_KEY
  );
  c.set("supabase" as never, supabase);
  await next();
});

// ============ 인증 미들웨어 ============

const PUBLIC_ROUTES: Array<{ method: string; path?: string; prefix?: string }> = [
  { method: "GET", path: "/api/health" },
  { method: "POST", path: "/api/pending-approvals" },
  { method: "GET", prefix: "/api/employees/email/" },
];

app.use("*", async (c, next) => {
  const isPublic = PUBLIC_ROUTES.some(
    (r) =>
      r.method === c.req.method &&
      (r.path ? c.req.path === r.path : r.prefix ? c.req.path.startsWith(r.prefix) : false)
  );
  if (isPublic) return await next();

  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "인증이 필요합니다." }, 401);
  }

  const supabase = c.get("supabase" as never) as any;
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(authHeader.slice(7));

  if (error || !user) {
    return c.json({ error: "유효하지 않은 인증 토큰입니다." }, 401);
  }

  c.set("user" as never, user);
  c.set("userEmail" as never, user.email);
  await next();
});

// 헬스 체크
app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ============ 라우트 마운트 ============
app.route("/api/customers", customers);
app.route("/api/contracts", contracts);
app.route("/api/notes", notes);
app.route("/api/employees", employees);
app.route("/api/sources", sources);
app.route("/api/dashboard", dashboard);
app.route("/api/pending-approvals", pendingApprovals);
app.route("/api/organizations", organizations);
app.route("/api/team", team);
app.route("/api/inquiries", inquiryRoutes);
app.route("/api/consultant-inquiries", consultantInquiryRoutes);
app.route("/api/recruit-inquiries", recruitInquiryRoutes);
app.route("/api/ads", ads);
app.route("/api/settings", settings);
app.route("/api/address", address);
app.route("/api/contacts", contacts);
app.route("/api/rank", rank);
app.route("/api/board-categories", boardCategoryRoutes);
app.route("/api/posts", postRoutes);
app.route("/api/menu-roles", menuRoleRoutes);
app.route("/api/menu-overrides", menuOverrideRoutes);
app.route("/api/dashboard-cards", dashboardCards);
app.route("/api/pages", pages);
app.route("/api/lead-products", leadProducts);
app.route("/api/lead-orders", leadOrders);
app.route("/api/card-orders", cardOrders);

// Cloudflare Pages Functions export
import { handle } from "hono/cloudflare-pages";
export const onRequest = handle(app);
export default app;
