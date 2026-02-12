import { Hono } from "hono";
import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import type { Env } from "../middleware/auth";
import { getAuthEmployee, requireSecurityLevel } from "../middleware/auth";
import { safeError, parsePagination } from "../middleware/helpers";

const app = new Hono<{ Bindings: Env }>();

// 이메일 발송 (best-effort, 관리자+신청자 이중 발송)
async function sendOrderEmail(c: any, order: any, items: any[], products: any[]) {
  const resendKey = c.env.RESEND_API_KEY;
  if (!resendKey) return;

  const adminEmail = c.env.ADMIN_NOTIFICATION_EMAIL || "admin@thefirst.co.kr";
  const productMap = new Map(products.map((p: any) => [p.id, p]));
  const formattedDate = new Date(order.created_at).toISOString().split("T")[0];

  const itemRows = items.map((item: any) => {
    const product = productMap.get(item.product_id);
    return `<tr>
      <td style="padding:8px;border:1px solid #ddd">${product?.name || "-"}</td>
      <td style="padding:8px;border:1px solid #ddd">${item.region || "-"}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right">${item.quantity}건</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right">${item.unit_price.toLocaleString()}원</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right">${item.total_price.toLocaleString()}원</td>
    </tr>`;
  }).join("");

  const orderTable = `
    <table style="border-collapse:collapse;width:100%">
      <thead>
        <tr style="background:#f5f5f5">
          <th style="padding:8px;border:1px solid #ddd;text-align:left">상품</th>
          <th style="padding:8px;border:1px solid #ddd;text-align:left">지역</th>
          <th style="padding:8px;border:1px solid #ddd;text-align:right">수량</th>
          <th style="padding:8px;border:1px solid #ddd;text-align:right">단가</th>
          <th style="padding:8px;border:1px solid #ddd;text-align:right">소계</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
      <tfoot>
        <tr style="font-weight:bold">
          <td colspan="4" style="padding:8px;border:1px solid #ddd;text-align:right">합계</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right">${order.total_amount.toLocaleString()}원</td>
        </tr>
      </tfoot>
    </table>`;

  const bankInfo = `
    <div style="background-color:#f7f7f7;padding:15px;border-radius:5px;margin-top:15px">
      <h4 style="margin:0;font-size:16px">DB입금계좌</h4>
      <p style="margin:5px 0 0;font-size:14px">카카오뱅크 3333-36-3512633 송낙주(영업지원팀)</p>
      <p style="margin:5px 0 0;font-size:14px;color:#333;font-weight:bold">담당자가 수량 확인 및 입금안내 드릴 예정입니다.</p>
    </div>`;

  // 관리자 이메일
  const adminHtml = `
    <h2>새로운 DB 신청이 접수되었습니다.</h2>
    <table style="border-collapse:collapse;margin-bottom:16px">
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold">신청자</td><td>${order.name}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold">소속</td><td>${order.affiliation || "-"}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold">직급</td><td>${order.position || "-"}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold">연락처</td><td>${order.phone || "-"}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold">이메일</td><td>${order.email || "-"}</td></tr>
    </table>
    <h3>신청 내역</h3>
    ${orderTable}
    ${bankInfo}
    <p style="color:#888;font-size:12px;margin-top:16px">주문번호: #${order.id} | ${formattedDate}</p>`;

  // 신청자 확인 이메일
  const applicantHtml = `
    <h2>DB 신청이 정상적으로 접수되었습니다.</h2>
    <p>안녕하세요, ${order.name}님. 신청해주셔서 감사합니다.</p>
    <p>아래는 신청하신 내역입니다. 확인 후 담당자가 개별 연락드리겠습니다.</p>
    <hr>
    <h3>신청 내역</h3>
    ${orderTable}
    ${bankInfo}
    <br>
    <p><em>*본 메일은 발신 전용입니다.</em></p>`;

  const emailPromises: Promise<any>[] = [];

  // 1. 관리자 이메일 (항상 발송)
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
        subject: `[DB신청] ${order.name} / ${order.affiliation || "-"} / ${order.position || "-"} / ${formattedDate}`,
        html: adminHtml,
      }),
    })
  );

  // 2. 신청자 이메일 (이메일 있을 때만)
  if (order.email) {
    emailPromises.push(
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "THE FIN. <noreply@crm.thefirst.co.kr>",
          to: [order.email],
          subject: `[${formattedDate}] ${order.name} ${order.position || ""}님, DB신청이 정상적으로 접수되었습니다.`,
          html: applicantHtml,
        }),
      })
    );
  }

  try {
    await Promise.all(emailPromises);
  } catch {
    // best-effort: 이메일 실패해도 주문은 유지
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
      .from("lead_orders")
      .select("*, orderer:employees!ordered_by(id, full_name)", { count: "exact" });

    // F1만 전체 주문 조회 가능, 나머지는 본인 주문만
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
      name: o.name,
      affiliation: o.affiliation,
      position: o.position,
      phone: o.phone,
      email: o.email,
      totalAmount: o.total_amount,
      status: o.status,
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
      .from("lead_orders")
      .select("*, orderer:employees!ordered_by(id, full_name)")
      .eq("id", id)
      .single();

    if (error || !order) return c.json({ error: "주문을 찾을 수 없습니다." }, 404);

    // 본인 주문 또는 F1만 조회 가능
    if (emp.security_level !== "F1" && (order as any).ordered_by !== emp.id) {
      return c.json({ error: "접근 권한이 없습니다." }, 403);
    }

    const { data: items } = await supabase
      .from("lead_order_items")
      .select("*, product:lead_products!product_id(name)")
      .eq("order_id", id)
      .order("id");

    return c.json({
      id: order.id,
      orderedBy: (order as any).ordered_by,
      orderedByName: (order as any).orderer?.full_name || "",
      name: (order as any).name,
      affiliation: (order as any).affiliation,
      position: (order as any).position,
      phone: (order as any).phone,
      email: (order as any).email,
      totalAmount: (order as any).total_amount,
      status: (order as any).status,
      cancelledAt: (order as any).cancelled_at,
      cancelledBy: (order as any).cancelled_by,
      createdAt: (order as any).created_at,
      items: (items || []).map((i: any) => ({
        id: i.id,
        productId: i.product_id,
        productName: i.product?.name || "",
        region: i.region,
        quantity: i.quantity,
        unitPrice: i.unit_price,
        totalPrice: i.total_price,
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
  const { name, affiliation, position, phone, email, items } = body;

  if (!name || !items?.length) {
    return c.json({ error: "신청자명과 상품 항목은 필수입니다." }, 400);
  }

  try {
    // 서버에서 상품 단가 조회 (클라이언트 가격 신뢰 금지)
    const productIds = [...new Set(items.map((i: any) => i.productId))];
    const { data: products, error: pErr } = await supabase
      .from("lead_products")
      .select("*")
      .in("id", productIds)
      .eq("is_active", true);

    if (pErr || !products) return safeError(c, pErr || new Error("상품 조회 실패"));

    const priceMap = new Map(products.map((p: any) => [p.id, p.price]));

    // 모든 상품이 유효한지 확인
    for (const item of items) {
      if (!priceMap.has(item.productId)) {
        return c.json({ error: `유효하지 않은 상품 ID: ${item.productId}` }, 400);
      }
      if (!item.quantity || item.quantity < 1) {
        return c.json({ error: "수량은 1 이상이어야 합니다." }, 400);
      }
    }

    // 주문 아이템 구성 + 합계 계산
    let totalAmount = 0;
    const orderItems = items.map((item: any) => {
      const unitPrice = priceMap.get(item.productId)!;
      const totalPrice = unitPrice * item.quantity;
      totalAmount += totalPrice;
      return {
        product_id: item.productId,
        region: item.region || null,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
      };
    });

    // 주문 저장
    const { data: order, error: oErr } = await supabase
      .from("lead_orders")
      .insert({
        ordered_by: emp.id,
        name,
        affiliation: affiliation || null,
        position: position || null,
        phone: phone || null,
        email: email || null,
        total_amount: totalAmount,
      })
      .select()
      .single();

    if (oErr || !order) return safeError(c, oErr || new Error("주문 생성 실패"));

    // 주문 아이템 저장
    const itemRows = orderItems.map((item: any) => ({
      ...item,
      order_id: order.id,
    }));

    const { error: iErr } = await supabase
      .from("lead_order_items")
      .insert(itemRows);

    if (iErr) return safeError(c, iErr);

    // 이메일 발송 (best-effort)
    sendOrderEmail(c, order, itemRows, products);

    return c.json({
      id: order.id,
      totalAmount: (order as any).total_amount,
      status: (order as any).status,
      createdAt: (order as any).created_at,
    }, 201);
  } catch (err) {
    return safeError(c, err);
  }
});

// PUT /:id/status - 주문 상태 변경 (F1)
app.put("/:id/status", async (c) => {
  const denied = await requireSecurityLevel(c, ["F1"]);
  if (denied) return denied;

  const supabase = c.get("supabase" as never) as SupabaseClient<Database>;
  const emp = await getAuthEmployee(c);
  const id = parseInt(c.req.param("id"));
  if (isNaN(id)) return c.json({ error: "유효하지 않은 ID" }, 400);

  const { status } = await c.req.json();
  const validStatuses = ["pending", "confirmed", "completed", "cancelled"];
  if (!validStatuses.includes(status)) {
    return c.json({ error: "유효하지 않은 상태값" }, 400);
  }

  try {
    const updateData: any = { status };
    if (status === "cancelled") {
      updateData.cancelled_at = new Date().toISOString();
      updateData.cancelled_by = emp.id;
    }

    const { data: order, error } = await supabase
      .from("lead_orders")
      .update(updateData)
      .eq("id", id)
      .select("*, orderer:employees!ordered_by(id, full_name)")
      .single();

    if (error) return safeError(c, error);

    return c.json({
      id: order.id,
      orderedBy: (order as any).ordered_by,
      orderedByName: (order as any).orderer?.full_name || "",
      name: (order as any).name,
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
