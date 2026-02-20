import { Hono } from "hono";
import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import type { Env } from "../middleware/auth";
import { getAuthEmployee, requireSecurityLevel } from "../middleware/auth";
import { safeError, parsePagination, sanitizeSearch } from "../middleware/helpers";

// 상담관리 status 화이트리스트
const VALID_STATUSES = [
  "new", "contacted", "consulting", "closed",
  "called", "texted", "no_answer", "rejected",
  "wrong_number", "ineligible", "upsell",
];

// F1-F4: 전체 접근, F5: 본인 배정 문의만
const MANAGER_LEVELS = ["F1", "F2", "F3", "F4"];

// 상담관리 (marketing.inquiries)
export const inquiryRoutes = new Hono<{ Bindings: Env }>();

inquiryRoutes.get("/", async (c) => {
  const emp = await getAuthEmployee(c);
  if (!emp) return c.json({ error: "사원 정보를 찾을 수 없습니다." }, 403);

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;

  const { page, limit, offset } = parsePagination(c);
  const search = sanitizeSearch(c.req.query("search") || "");
  const status = c.req.query("status") || "";
  const managerId = c.req.query("managerId") || "";

  let query = (supabase as any)
    .schema("marketing")
    .from("inquiries")
    .select("*", { count: "exact" })
    .not("source_url", "ilike", "%contact-forms/456%")
    .not("utm_campaign", "ilike", "%recruit%");

  // F5: 본인 배정 문의만 조회 가능
  if (!MANAGER_LEVELS.includes(emp.security_level)) {
    query = query.eq("manager_id", emp.id);
  }

  if (search) {
    query = query.or(`customer_name.ilike.%${search}%,phone.ilike.%${search}%`);
  }
  if (status) {
    if (status.startsWith("!")) {
      query = query.neq("status", status.slice(1));
    } else {
      query = query.eq("status", status);
    }
  }
  if (managerId && MANAGER_LEVELS.includes(emp.security_level)) {
    query = query.eq("manager_id", managerId);
  }

  query = query.order("created_at", { ascending: false });
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    return safeError(c, error);
  }

  const managerIds = [
    ...new Set((data || []).map((r: any) => r.manager_id).filter(Boolean)),
  ];
  let managersMap: Record<string, string> = {};
  if (managerIds.length > 0) {
    const { data: managers } = await supabase
      .from("employees")
      .select("id, full_name")
      .in("id", managerIds);
    if (managers) {
      managersMap = Object.fromEntries(
        managers.map((m: any) => [m.id, m.full_name])
      );
    }
  }

  const inquiries = (data || []).map((row: any) => ({
    id: row.id,
    customerName: row.customer_name,
    phone: row.phone,
    productName: row.product_name,
    utmCampaign: row.utm_campaign,
    sourceUrl: row.source_url,
    inquiryDate: row.inquiry_date,
    managerId: row.manager_id,
    managerName: row.manager_id ? managersMap[row.manager_id] || null : null,
    status: row.status || "new",
    email: row.email,
    memo: row.memo,
    adminComment: row.admin_comment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return c.json({
    data: inquiries,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
});

inquiryRoutes.put("/:id", async (c) => {
  const emp = await getAuthEmployee(c);
  if (!emp) return c.json({ error: "사원 정보를 찾을 수 없습니다." }, 403);

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");
  const body = await c.req.json();

  // status 화이트리스트 검증
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    return c.json({ error: `잘못된 상태값: ${body.status}` }, 400);
  }

  // F5: 담당자 배정(managerId) 변경 불가
  if (!MANAGER_LEVELS.includes(emp.security_level) && body.managerId !== undefined) {
    return c.json({ error: "담당자 변경 권한이 없습니다." }, 403);
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.managerId !== undefined) updateData.manager_id = body.managerId;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.memo !== undefined) updateData.memo = body.memo;
  if (body.email !== undefined) updateData.email = body.email;
  if (body.adminComment !== undefined) updateData.admin_comment = body.adminComment;

  let updateQuery = (supabase as any)
    .schema("marketing")
    .from("inquiries")
    .update(updateData)
    .eq("id", id);

  // F5: 본인 배정 문의만 수정 가능
  if (!MANAGER_LEVELS.includes(emp.security_level)) {
    updateQuery = updateQuery.eq("manager_id", emp.id);
  }

  const { data, error } = await updateQuery
    .select("*")
    .single();

  if (error) {
    return safeError(c, error);
  }

  return c.json({
    id: data.id,
    customerName: data.customer_name,
    phone: data.phone,
    productName: data.product_name,
    utmCampaign: data.utm_campaign,
    sourceUrl: data.source_url,
    inquiryDate: data.inquiry_date,
    managerId: data.manager_id,
    status: data.status || "new",
    email: data.email,
    memo: data.memo,
    adminComment: data.admin_comment,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  });
});

inquiryRoutes.post("/", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1", "F2", "F3", "F4"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const body = await c.req.json();

  // status 화이트리스트 검증
  const status = body.status || "new";
  if (!VALID_STATUSES.includes(status)) {
    return c.json({ error: `잘못된 상태값: ${status}` }, 400);
  }

  const insertData: Record<string, unknown> = {
    customer_name: body.customerName,
    phone: body.phone,
    product_name: body.productName || null,
    status,
    manager_id: body.managerId || null,
    memo: body.memo || null,
    inquiry_date: new Date().toISOString(),
  };

  const { data, error } = await (supabase as any)
    .schema("marketing")
    .from("inquiries")
    .insert(insertData)
    .select("*")
    .single();

  if (error) {
    return safeError(c, error);
  }

  return c.json({
    id: data.id,
    customerName: data.customer_name,
    phone: data.phone,
    productName: data.product_name,
    managerId: data.manager_id,
    status: data.status || "new",
    memo: data.memo,
    inquiryDate: data.inquiry_date,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }, 201);
});

// the-fin 문의 (marketing.consultant_inquiries)
export const consultantInquiryRoutes = new Hono<{ Bindings: Env }>();

consultantInquiryRoutes.get("/", async (c) => {
  const emp = await getAuthEmployee(c);
  if (!emp) return c.json({ error: "사원 정보를 찾을 수 없습니다." }, 403);

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;

  const { page, limit, offset } = parsePagination(c);
  const search = sanitizeSearch(c.req.query("search") || "");
  const status = c.req.query("status") || "";
  const managerId = c.req.query("managerId") || "";

  let query = (supabase as any)
    .schema("marketing")
    .from("consultant_inquiries")
    .select("*", { count: "exact" });

  if (!MANAGER_LEVELS.includes(emp.security_level)) {
    query = query.eq("manager_id", emp.id);
  }

  if (search) {
    query = query.or(`customer_name.ilike.%${search}%,phone.ilike.%${search}%`);
  }
  if (status) {
    if (status.startsWith("!")) {
      query = query.neq("status", status.slice(1));
    } else {
      query = query.eq("status", status);
    }
  }
  if (managerId && MANAGER_LEVELS.includes(emp.security_level)) {
    query = query.eq("manager_id", managerId);
  }

  query = query.order("created_at", { ascending: false });
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    return safeError(c, error);
  }

  const managerIds = [
    ...new Set((data || []).map((r: any) => r.manager_id).filter(Boolean)),
  ];
  let managersMap: Record<string, string> = {};
  if (managerIds.length > 0) {
    const { data: managers } = await supabase
      .from("employees")
      .select("id, full_name")
      .in("id", managerIds);
    if (managers) {
      managersMap = Object.fromEntries(
        managers.map((m: any) => [m.id, m.full_name])
      );
    }
  }

  const inquiries = (data || []).map((row: any) => ({
    id: row.id,
    customerName: row.customer_name,
    phone: row.phone,
    productName: row.product_name,
    consultant: row.consultant,
    tfRef: row.tf_ref,
    refererPage: row.referer_page,
    request: row.request,
    sourceUrl: row.source_url,
    inquiryDate: row.inquiry_date,
    managerId: row.manager_id,
    managerName: row.manager_id ? managersMap[row.manager_id] || null : null,
    status: row.status || "new",
    memo: row.memo,
    adminComment: row.admin_comment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return c.json({
    data: inquiries,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
});

consultantInquiryRoutes.put("/:id", async (c) => {
  const emp = await getAuthEmployee(c);
  if (!emp) return c.json({ error: "사원 정보를 찾을 수 없습니다." }, 403);

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");
  const body = await c.req.json();

  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    return c.json({ error: `잘못된 상태값: ${body.status}` }, 400);
  }

  if (!MANAGER_LEVELS.includes(emp.security_level) && body.managerId !== undefined) {
    return c.json({ error: "담당자 변경 권한이 없습니다." }, 403);
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.managerId !== undefined) updateData.manager_id = body.managerId;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.memo !== undefined) updateData.memo = body.memo;
  if (body.adminComment !== undefined) updateData.admin_comment = body.adminComment;

  let updateQuery = (supabase as any)
    .schema("marketing")
    .from("consultant_inquiries")
    .update(updateData)
    .eq("id", id);

  if (!MANAGER_LEVELS.includes(emp.security_level)) {
    updateQuery = updateQuery.eq("manager_id", emp.id);
  }

  const { data, error } = await updateQuery
    .select("*")
    .single();

  if (error) {
    return safeError(c, error);
  }

  return c.json({
    id: data.id,
    customerName: data.customer_name,
    phone: data.phone,
    productName: data.product_name,
    consultant: data.consultant,
    tfRef: data.tf_ref,
    refererPage: data.referer_page,
    request: data.request,
    sourceUrl: data.source_url,
    inquiryDate: data.inquiry_date,
    managerId: data.manager_id,
    status: data.status || "new",
    memo: data.memo,
    adminComment: data.admin_comment,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  });
});

// 입사문의 (marketing.recruit_inquiries)
export const recruitInquiryRoutes = new Hono<{ Bindings: Env }>();

recruitInquiryRoutes.get("/", async (c) => {
  const emp = await getAuthEmployee(c);
  if (!emp) return c.json({ error: "사원 정보를 찾을 수 없습니다." }, 403);

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;

  const { page, limit, offset } = parsePagination(c);
  const search = sanitizeSearch(c.req.query("search") || "");
  const status = c.req.query("status") || "";
  const managerId = c.req.query("managerId") || "";

  let query = (supabase as any)
    .schema("marketing")
    .from("recruit_inquiries")
    .select("*", { count: "exact" });

  if (!MANAGER_LEVELS.includes(emp.security_level)) {
    query = query.eq("manager_id", emp.id);
  }

  if (search) {
    query = query.or(`customer_name.ilike.%${search}%,phone.ilike.%${search}%`);
  }
  if (status) {
    if (status.startsWith("!")) {
      query = query.neq("status", status.slice(1));
    } else {
      query = query.eq("status", status);
    }
  }
  if (managerId && MANAGER_LEVELS.includes(emp.security_level)) {
    query = query.eq("manager_id", managerId);
  }

  query = query.order("inquiry_date", { ascending: false, nullsFirst: false });
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    return safeError(c, error);
  }

  const managerIds = [
    ...new Set((data || []).map((r: any) => r.manager_id).filter(Boolean)),
  ];
  let managersMap: Record<string, string> = {};
  if (managerIds.length > 0) {
    const { data: managers } = await supabase
      .from("employees")
      .select("id, full_name")
      .in("id", managerIds);
    if (managers) {
      managersMap = Object.fromEntries(
        managers.map((m: any) => [m.id, m.full_name])
      );
    }
  }

  const inquiries = (data || []).map((row: any) => ({
    id: row.id,
    customerName: row.customer_name,
    phone: row.phone,
    age: row.age,
    area: row.area,
    career: row.career,
    request: row.request,
    utmCampaign: row.utm_campaign,
    sourceUrl: row.source_url,
    refererPage: row.referer_page,
    inquiryDate: row.inquiry_date,
    managerId: row.manager_id,
    managerName: row.manager_id ? managersMap[row.manager_id] || null : null,
    status: row.status || "new",
    memo: row.memo,
    adminComment: row.admin_comment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return c.json({
    data: inquiries,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
});

recruitInquiryRoutes.put("/:id", async (c) => {
  const emp = await getAuthEmployee(c);
  if (!emp) return c.json({ error: "사원 정보를 찾을 수 없습니다." }, 403);

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const id = c.req.param("id");
  const body = await c.req.json();

  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    return c.json({ error: `잘못된 상태값: ${body.status}` }, 400);
  }

  if (!MANAGER_LEVELS.includes(emp.security_level) && body.managerId !== undefined) {
    return c.json({ error: "담당자 변경 권한이 없습니다." }, 403);
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.managerId !== undefined) updateData.manager_id = body.managerId;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.memo !== undefined) updateData.memo = body.memo;
  if (body.adminComment !== undefined) updateData.admin_comment = body.adminComment;

  let updateQuery = (supabase as any)
    .schema("marketing")
    .from("recruit_inquiries")
    .update(updateData)
    .eq("id", id);

  if (!MANAGER_LEVELS.includes(emp.security_level)) {
    updateQuery = updateQuery.eq("manager_id", emp.id);
  }

  const { data, error } = await updateQuery
    .select("*")
    .single();

  if (error) {
    return safeError(c, error);
  }

  return c.json({
    id: data.id,
    customerName: data.customer_name,
    phone: data.phone,
    age: data.age,
    area: data.area,
    career: data.career,
    request: data.request,
    utmCampaign: data.utm_campaign,
    sourceUrl: data.source_url,
    refererPage: data.referer_page,
    inquiryDate: data.inquiry_date,
    managerId: data.manager_id,
    status: data.status || "new",
    memo: data.memo,
    adminComment: data.admin_comment,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  });
});
