import { Hono } from "hono";
import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import type { Env } from "../middleware/auth";
import { getAuthEmployee, requireSecurityLevel } from "../middleware/auth";
import { safeError, parsePagination } from "../middleware/helpers";

const app = new Hono<{ Bindings: Env }>();

const UNIT_PRICE = 12000; // 1세트(1box, 200장) 단가

// 디자인 라벨 맵
const DESIGN_LABELS: Record<number, string> = {
  1: "시안 1",
  2: "시안 2",
  3: "시안 3",
  4: "시안 4",
  5: "시안 5",
  6: "시안 6",
  7: "시안 7 (세로)",
  8: "시안 8 (세로)",
  9: "시안 9 (세로)",
};

// 이메일 발송 (best-effort)
async function sendCardOrderEmail(c: any, order: any, applicants: any[]) {
  const resendKey = c.env.RESEND_API_KEY;
  if (!resendKey) return;

  const adminEmail = c.env.ADMIN_NOTIFICATION_EMAIL || "admin@thefirst.co.kr";
  const formattedDate = new Date(order.created_at).toISOString().split("T")[0];

  const applicantRows = applicants
    .map(
      (a: any) => `<tr>
      <td style="padding:6px 8px;border:1px solid #ddd">${DESIGN_LABELS[a.design] || a.design}</td>
      <td style="padding:6px 8px;border:1px solid #ddd">${a.card_type}</td>
      <td style="padding:6px 8px;border:1px solid #ddd">${a.name}</td>
      <td style="padding:6px 8px;border:1px solid #ddd">${a.grade || "-"}</td>
      <td style="padding:6px 8px;border:1px solid #ddd">${a.branch || "-"}</td>
      <td style="padding:6px 8px;border:1px solid #ddd">${a.phone || "-"}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;text-align:center">${a.qty}</td>
    </tr>`
    )
    .join("");

  const orderTable = `
    <table style="border-collapse:collapse;width:100%;font-size:13px">
      <thead>
        <tr style="background:#f5f5f5">
          <th style="padding:6px 8px;border:1px solid #ddd;text-align:left">시안</th>
          <th style="padding:6px 8px;border:1px solid #ddd;text-align:left">유형</th>
          <th style="padding:6px 8px;border:1px solid #ddd;text-align:left">이름</th>
          <th style="padding:6px 8px;border:1px solid #ddd;text-align:left">직급</th>
          <th style="padding:6px 8px;border:1px solid #ddd;text-align:left">지사</th>
          <th style="padding:6px 8px;border:1px solid #ddd;text-align:left">연락처</th>
          <th style="padding:6px 8px;border:1px solid #ddd;text-align:center">수량</th>
        </tr>
      </thead>
      <tbody>${applicantRows}</tbody>
    </table>`;

  const bankInfo = `
    <div style="background-color:#f7f7f7;padding:15px;border-radius:5px;margin-top:15px">
      <h4 style="margin:0;font-size:16px">입금계좌</h4>
      <p style="margin:5px 0 0;font-size:14px">카카오뱅크 3333-322-537940</p>
      <p style="margin:5px 0 0;font-size:14px;color:#333;font-weight:bold">담당자가 확인 후 개별 연락드리겠습니다.</p>
    </div>`;

  // 관리자 이메일
  const adminHtml = `
    <h2>새로운 명함 신청이 접수되었습니다.</h2>
    <table style="border-collapse:collapse;margin-bottom:16px;font-size:14px">
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold">주문번호</td><td>#${order.id}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold">받는 분</td><td>${order.recipient_name || "-"}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold">연락처</td><td>${order.recipient_phone || "-"}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold">배송지</td><td>${order.recipient_address || "-"}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold">이메일</td><td>${order.recipient_email || "-"}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold">총 수량</td><td>${order.total_qty}세트</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold">합계</td><td>${order.total_amount.toLocaleString()}원</td></tr>
    </table>
    <h3>신청자 목록</h3>
    ${orderTable}
    <p style="color:#888;font-size:12px;margin-top:16px">${formattedDate}</p>`;

  // 고객 이메일
  const customerHtml = `
    <h2>명함 신청이 정상적으로 접수되었습니다.</h2>
    <p>안녕하세요. 명함 신청해주셔서 감사합니다.</p>
    <table style="border-collapse:collapse;margin:16px 0;font-size:14px">
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold">주문번호</td><td>#${order.id}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold">총 수량</td><td>${order.total_qty}세트</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold">합계</td><td>${order.total_amount.toLocaleString()}원</td></tr>
    </table>
    ${bankInfo}
    <br>
    <p><em>*본 메일은 발신 전용입니다.</em></p>`;

  const emailPromises: Promise<Response>[] = [];

  // 1. 관리자 이메일
  emailPromises.push(
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CRM <noreply@crm.thefirst.co.kr>",
        to: adminEmail.split(",").map((e: string) => e.trim()),
        subject: `[명함신청] ${applicants.map((a: any) => a.name).join(", ")} / ${formattedDate}`,
        html: adminHtml,
      }),
    })
  );

  // 2. 고객 이메일 (배송지 이메일이 있을 때만)
  if (order.recipient_email) {
    emailPromises.push(
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "THE FIN. <noreply@crm.thefirst.co.kr>",
          to: [order.recipient_email],
          subject: `[${formattedDate}] 명함 신청 접수 확인`,
          html: customerHtml,
        }),
      })
    );
  }

  try {
    const results = await Promise.all(emailPromises);
    for (const res of results) {
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error("[sendCardOrderEmail] Resend API error:", res.status, body);
      }
    }
  } catch (err) {
    console.error("[sendCardOrderEmail] Failed to send email:", err);
  }
}

// GET / - 주문 목록
app.get("/", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const emp = await getAuthEmployee(c);
  if (!emp) return c.json({ error: "사원 정보를 찾을 수 없습니다." }, 403);

  const { page, limit, offset } = parsePagination(c);
  const status = c.req.query("status");

  try {
    let query = supabase
      .from("card_orders")
      .select("*, orderer:employees!ordered_by(id, full_name)", { count: "exact" });

    // F1만 전체 조회, 나머지는 본인만
    if (emp.security_level !== "F1") {
      query = query.eq("ordered_by", emp.id);
    }

    if (status) {
      query = query.eq("status", status);
    }

    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) return safeError(c, error);

    const orders = (data || []).map((o: any) => ({
      id: o.id,
      orderedBy: o.ordered_by,
      orderedByName: o.orderer?.full_name || "",
      totalQty: o.total_qty,
      deliveryFee: o.delivery_fee,
      totalAmount: o.total_amount,
      status: o.status,
      recipientName: o.recipient_name,
      recipientPhone: o.recipient_phone,
      recipientAddress: o.recipient_address,
      recipientEmail: o.recipient_email,
      cancelledAt: o.cancelled_at,
      cancelledBy: o.cancelled_by,
      createdAt: o.created_at,
    }));

    return c.json({ data: orders, total: count || 0, page, limit });
  } catch (err) {
    return safeError(c, err);
  }
});

// GET /:id - 주문 상세
app.get("/:id", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const emp = await getAuthEmployee(c);
  if (!emp) return c.json({ error: "사원 정보를 찾을 수 없습니다." }, 403);

  const id = parseInt(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "유효하지 않은 ID" }, 400);

  try {
    const { data: order, error } = await supabase
      .from("card_orders")
      .select("*, orderer:employees!ordered_by(id, full_name)")
      .eq("id", id)
      .single();

    if (error || !order) return c.json({ error: "주문을 찾을 수 없습니다." }, 404);

    // 본인 주문 또는 F1만 조회 가능
    if (emp.security_level !== "F1" && (order as any).ordered_by !== emp.id) {
      return c.json({ error: "접근 권한이 없습니다." }, 403);
    }

    const { data: applicants } = await supabase
      .from("card_order_applicants")
      .select("*")
      .eq("order_id", id)
      .order("id");

    return c.json({
      id: order.id,
      orderedBy: (order as any).ordered_by,
      orderedByName: (order as any).orderer?.full_name || "",
      totalQty: (order as any).total_qty,
      deliveryFee: (order as any).delivery_fee,
      totalAmount: (order as any).total_amount,
      status: (order as any).status,
      recipientName: (order as any).recipient_name,
      recipientPhone: (order as any).recipient_phone,
      recipientAddress: (order as any).recipient_address,
      recipientEmail: (order as any).recipient_email,
      cancelledAt: (order as any).cancelled_at,
      cancelledBy: (order as any).cancelled_by,
      createdAt: (order as any).created_at,
      applicants: (applicants || []).map((a: any) => ({
        id: a.id,
        design: a.design,
        designLabel: a.design_label,
        cardType: a.card_type,
        name: a.name,
        grade: a.grade,
        branch: a.branch,
        phone: a.phone,
        email: a.email,
        fax: a.fax,
        addrBase: a.addr_base,
        addrDetail: a.addr_detail,
        request: a.request,
        qty: a.qty,
      })),
    });
  } catch (err) {
    return safeError(c, err);
  }
});

// POST / - 주문 생성
app.post("/", async (c) => {
  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const emp = await getAuthEmployee(c);
  if (!emp) return c.json({ error: "사원 정보를 찾을 수 없습니다." }, 403);

  const body = await c.req.json();
  const { applicants, recipient } = body;

  if (!applicants?.length) {
    return c.json({ error: "신청자 정보는 필수입니다." }, 400);
  }

  try {
    // 서버에서 가격 계산 (클라이언트 가격 신뢰 금지)
    let totalQty = 0;
    for (const a of applicants) {
      if (!a.name || !a.design || !a.cardType || !a.qty || a.qty < 1) {
        return c.json({ error: "신청자 이름, 시안, 유형, 수량은 필수입니다." }, 400);
      }
      if (a.design < 1 || a.design > 9) {
        return c.json({ error: "유효하지 않은 시안 번호입니다." }, 400);
      }
      totalQty += a.qty;
    }

    const deliveryFee = 0; // 배송비 없음 (필요시 로직 추가)
    const totalAmount = totalQty * UNIT_PRICE + deliveryFee;

    // 주문 저장
    const { data: order, error: oErr } = await supabase
      .from("card_orders")
      .insert({
        ordered_by: emp.id,
        total_qty: totalQty,
        delivery_fee: deliveryFee,
        total_amount: totalAmount,
        recipient_name: recipient?.name || null,
        recipient_phone: recipient?.phone || null,
        recipient_address: recipient?.address || null,
        recipient_email: recipient?.email || null,
      })
      .select()
      .single();

    if (oErr || !order) return safeError(c, oErr || new Error("주문 생성 실패"));

    // 신청자 저장
    const applicantRows = applicants.map((a: any) => ({
      order_id: order.id,
      design: a.design,
      design_label: DESIGN_LABELS[a.design] || `시안 ${a.design}`,
      card_type: a.cardType,
      name: a.name,
      grade: a.grade || null,
      branch: a.branch || null,
      phone: a.phone || null,
      email: a.email || null,
      fax: a.fax || null,
      addr_base: a.addrBase || null,
      addr_detail: a.addrDetail || null,
      request: a.request || null,
      qty: a.qty,
    }));

    const { error: aErr } = await supabase
      .from("card_order_applicants")
      .insert(applicantRows);

    if (aErr) return safeError(c, aErr);

    // 이메일 발송 (best-effort)
    sendCardOrderEmail(c, order, applicantRows);

    return c.json(
      {
        id: order.id,
        totalQty: (order as any).total_qty,
        totalAmount: (order as any).total_amount,
        status: (order as any).status,
        createdAt: (order as any).created_at,
      },
      201
    );
  } catch (err) {
    return safeError(c, err);
  }
});

// PUT /:id/status - 상태 변경 (F1)
app.put("/:id/status", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const emp = await getAuthEmployee(c);
  const id = parseInt(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "유효하지 않은 ID" }, 400);

  const { status } = await c.req.json();
  const validStatuses = ["pending", "confirmed", "printing", "shipped", "completed", "cancelled"];
  if (!validStatuses.includes(status)) {
    return c.json({ error: "유효하지 않은 상태값" }, 400);
  }

  try {
    const updateData: any = { status };
    if (status === "cancelled") {
      updateData.cancelled_at = new Date().toISOString();
      updateData.cancelled_by = emp!.id;
    }

    const { data: order, error } = await supabase
      .from("card_orders")
      .update(updateData)
      .eq("id", id)
      .select("*, orderer:employees!ordered_by(id, full_name)")
      .single();

    if (error) return safeError(c, error);

    return c.json({
      id: order.id,
      orderedBy: (order as any).ordered_by,
      orderedByName: (order as any).orderer?.full_name || "",
      totalQty: (order as any).total_qty,
      totalAmount: (order as any).total_amount,
      status: (order as any).status,
      cancelledAt: (order as any).cancelled_at,
      cancelledBy: (order as any).cancelled_by,
      createdAt: (order as any).created_at,
    });
  } catch (err) {
    return safeError(c, err);
  }
});

export default app;
