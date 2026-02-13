import { useState } from "react";
import {
  useCardOrders,
  useCardOrder,
  useUpdateCardOrderStatus,
} from "@/hooks/useCardOrders";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Eye } from "lucide-react";
import type { CardOrderStatus } from "@/types/cardOrder";

const STATUS_LABELS: Record<CardOrderStatus, string> = {
  pending: "대기",
  confirmed: "확인",
  printing: "인쇄 중",
  shipped: "배송 중",
  completed: "완료",
  cancelled: "취소",
};

const STATUS_COLORS: Record<CardOrderStatus, string> = {
  pending: "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400",
  confirmed: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
  printing: "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
  shipped: "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
  completed: "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400",
  cancelled: "bg-zinc-100 dark:bg-zinc-800 text-zinc-400",
};

export default function CardOrderAdminPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [detailId, setDetailId] = useState<number | null>(null);
  const { data, isLoading } = useCardOrders({ page, status: statusFilter || undefined });
  const { data: detail } = useCardOrder(detailId);
  const updateStatus = useUpdateCardOrderStatus();

  const orders = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">명함 관리</h1>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="전체 상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="pending">대기</SelectItem>
              <SelectItem value="confirmed">확인</SelectItem>
              <SelectItem value="printing">인쇄 중</SelectItem>
              <SelectItem value="shipped">배송 중</SelectItem>
              <SelectItem value="completed">완료</SelectItem>
              <SelectItem value="cancelled">취소</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">총 {total}건</span>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-4 py-3 font-medium w-16">#</th>
                <th className="text-left px-4 py-3 font-medium">주문자</th>
                <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">수량</th>
                <th className="text-right px-4 py-3 font-medium">금액</th>
                <th className="text-center px-4 py-3 font-medium w-24">상태</th>
                <th className="text-center px-4 py-3 font-medium w-32 hidden sm:table-cell">일시</th>
                <th className="text-center px-4 py-3 font-medium w-28">관리</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    주문 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground">{order.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{order.orderedByName}</div>
                      {order.recipientName && (
                        <div className="text-xs text-muted-foreground">수신: {order.recipientName}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">{order.totalQty}세트</td>
                    <td className="px-4 py-3 text-right font-medium">{order.totalAmount.toLocaleString()}원</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-muted-foreground hidden sm:table-cell">
                      {new Date(order.createdAt).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailId(order.id)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {order.status !== "cancelled" && order.status !== "completed" && (
                          <Select
                            value={order.status}
                            onValueChange={(v) => updateStatus.mutate({ id: order.id, status: v })}
                          >
                            <SelectTrigger className="h-7 w-20 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">대기</SelectItem>
                              <SelectItem value="confirmed">확인</SelectItem>
                              <SelectItem value="printing">인쇄 중</SelectItem>
                              <SelectItem value="shipped">배송 중</SelectItem>
                              <SelectItem value="completed">완료</SelectItem>
                              <SelectItem value="cancelled">취소</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <Button
                key={i}
                variant={page === i + 1 ? "default" : "outline"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </Button>
            ))}
          </div>
        )}

        {/* 주문 상세 다이얼로그 */}
        <Dialog open={detailId !== null} onOpenChange={(open) => !open && setDetailId(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>명함 주문 상세 #{detailId}</DialogTitle>
            </DialogHeader>
            {detail ? (
              <div className="space-y-4 text-sm">
                {/* 주문 정보 */}
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">주문자:</span> {detail.orderedByName}</div>
                  <div>
                    <span className="text-muted-foreground">상태:</span>{" "}
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[detail.status]}`}>
                      {STATUS_LABELS[detail.status]}
                    </span>
                  </div>
                  <div><span className="text-muted-foreground">수량:</span> {detail.totalQty}세트</div>
                  <div><span className="text-muted-foreground">합계:</span> {detail.totalAmount.toLocaleString()}원</div>
                </div>

                {/* 배송지 */}
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <h4 className="font-semibold text-xs text-muted-foreground uppercase">배송지</h4>
                  <div className="grid grid-cols-2 gap-1">
                    <div>받는 분: {detail.recipientName || "-"}</div>
                    <div>연락처: {detail.recipientPhone || "-"}</div>
                    <div className="col-span-2">주소: {detail.recipientAddress || "-"}</div>
                    <div>이메일: {detail.recipientEmail || "-"}</div>
                  </div>
                </div>

                {/* 신청자 목록 */}
                <div>
                  <h4 className="font-semibold mb-2">신청자 목록 ({detail.applicants?.length || 0}건)</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          <th className="text-left px-3 py-2 font-medium">시안</th>
                          <th className="text-left px-3 py-2 font-medium">유형</th>
                          <th className="text-left px-3 py-2 font-medium">이름</th>
                          <th className="text-left px-3 py-2 font-medium">직급</th>
                          <th className="text-left px-3 py-2 font-medium">지사</th>
                          <th className="text-left px-3 py-2 font-medium">연락처</th>
                          <th className="text-center px-3 py-2 font-medium">수량</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.applicants?.map((a) => (
                          <tr key={a.id} className="border-b last:border-b-0">
                            <td className="px-3 py-2">{a.designLabel || `시안 ${a.design}`}</td>
                            <td className="px-3 py-2">{a.cardType}</td>
                            <td className="px-3 py-2 font-medium">{a.name}</td>
                            <td className="px-3 py-2 text-muted-foreground">{a.grade || "-"}</td>
                            <td className="px-3 py-2 text-muted-foreground">{a.branch || "-"}</td>
                            <td className="px-3 py-2 text-muted-foreground">{a.phone || "-"}</td>
                            <td className="px-3 py-2 text-center">{a.qty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 신청자 상세 (이메일, 팩스, 주소, 요청) */}
                {detail.applicants?.some(a => a.email || a.fax || a.addrBase || a.request) && (
                  <div>
                    <h4 className="font-semibold mb-2 text-xs text-muted-foreground uppercase">추가 정보</h4>
                    {detail.applicants?.map((a) => (
                      (a.email || a.fax || a.addrBase || a.request) && (
                        <div key={a.id} className="border-b last:border-b-0 py-2">
                          <p className="font-medium">{a.name}</p>
                          {a.email && <p className="text-muted-foreground">이메일: {a.email}</p>}
                          {a.fax && <p className="text-muted-foreground">팩스: {a.fax}</p>}
                          {a.addrBase && <p className="text-muted-foreground">주소: {a.addrBase} {a.addrDetail || ""}</p>}
                          {a.request && <p className="text-muted-foreground">요청: {a.request}</p>}
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
