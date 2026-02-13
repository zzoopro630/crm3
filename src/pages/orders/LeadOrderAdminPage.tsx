import { useState } from "react";
import {
  useLeadOrders,
  useLeadOrder,
  useUpdateOrderStatus,
  useLeadProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from "@/hooks/useOrders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Plus, Pencil, Trash2, Eye } from "lucide-react";
import type { OrderStatus, LeadProduct } from "@/types/order";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "대기",
  confirmed: "확인",
  completed: "완료",
  cancelled: "취소",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400",
  confirmed: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
  completed: "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400",
  cancelled: "bg-zinc-100 dark:bg-zinc-800 text-zinc-400",
};

export default function LeadOrderAdminPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">주문 관리</h1>
      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">주문 내역</TabsTrigger>
          <TabsTrigger value="products">상품 관리</TabsTrigger>
        </TabsList>
        <TabsContent value="orders" className="mt-4">
          <OrdersTab />
        </TabsContent>
        <TabsContent value="products" className="mt-4">
          <ProductsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============ 주문 탭 ============
function OrdersTab() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [detailId, setDetailId] = useState<number | null>(null);
  const { data, isLoading } = useLeadOrders({ page, status: statusFilter || undefined });
  const { data: detail } = useLeadOrder(detailId);
  const updateStatus = useUpdateOrderStatus();

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
              <th className="text-left px-4 py-3 font-medium">신청자</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">소속</th>
              <th className="text-right px-4 py-3 font-medium">금액</th>
              <th className="text-center px-4 py-3 font-medium w-20">상태</th>
              <th className="text-center px-4 py-3 font-medium w-32">일시</th>
              <th className="text-center px-4 py-3 font-medium w-24">관리</th>
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
                    <div className="font-medium">{order.name}</div>
                    <div className="text-xs text-muted-foreground">{order.orderedByName}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{order.affiliation || "-"}</td>
                  <td className="px-4 py-3 text-right font-medium">{order.totalAmount.toLocaleString()}원</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-muted-foreground">
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
                          <SelectTrigger className="h-7 w-16 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">대기</SelectItem>
                            <SelectItem value="confirmed">확인</SelectItem>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>주문 상세 #{detailId}</DialogTitle>
          </DialogHeader>
          {detail ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">신청자:</span> {detail.name}</div>
                <div><span className="text-muted-foreground">소속:</span> {detail.affiliation || "-"}</div>
                <div><span className="text-muted-foreground">직급:</span> {detail.position || "-"}</div>
                <div><span className="text-muted-foreground">연락처:</span> {detail.phone || "-"}</div>
                <div><span className="text-muted-foreground">이메일:</span> {detail.email || "-"}</div>
                <div>
                  <span className="text-muted-foreground">상태:</span>{" "}
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[detail.status]}`}>
                    {STATUS_LABELS[detail.status]}
                  </span>
                </div>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left px-3 py-2 font-medium">상품</th>
                      <th className="text-left px-3 py-2 font-medium">지역</th>
                      <th className="text-right px-3 py-2 font-medium">수량</th>
                      <th className="text-right px-3 py-2 font-medium">단가</th>
                      <th className="text-right px-3 py-2 font-medium">소계</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items?.map((item) => (
                      <tr key={item.id} className="border-b last:border-b-0">
                        <td className="px-3 py-2">{item.productName}</td>
                        <td className="px-3 py-2 text-muted-foreground">{item.region || "-"}</td>
                        <td className="px-3 py-2 text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">{item.unitPrice.toLocaleString()}원</td>
                        <td className="px-3 py-2 text-right font-medium">{item.totalPrice.toLocaleString()}원</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold">
                      <td colSpan={4} className="px-3 py-2 text-right">합계</td>
                      <td className="px-3 py-2 text-right">{detail.totalAmount.toLocaleString()}원</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ 상품 탭 ============
function ProductsTab() {
  const { data: products = [], isLoading } = useLeadProducts(true);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LeadProduct | null>(null);
  const [form, setForm] = useState({
    dbType: "",
    name: "",
    price: 0,
    description: "",
    isActive: true,
    sortOrder: 0,
  });
  const [deleteTarget, setDeleteTarget] = useState<LeadProduct | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm({ dbType: "", name: "", price: 0, description: "", isActive: true, sortOrder: 0 });
    setDialogOpen(true);
  };

  const openEdit = (p: LeadProduct) => {
    setEditing(p);
    setForm({
      dbType: p.dbType,
      name: p.name,
      price: p.price,
      description: p.description || "",
      isActive: p.isActive,
      sortOrder: p.sortOrder,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.dbType.trim() || !form.name.trim() || form.price <= 0) return;

    try {
      if (editing) {
        await updateProduct.mutateAsync({ id: editing.id, input: form });
      } else {
        await createProduct.mutateAsync(form);
      }
      setDialogOpen(false);
    } catch { /* 글로벌 onError에서 toast 처리 */ }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProduct.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // 에러는 mutation에서 처리
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" /> 상품 추가
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left px-4 py-3 font-medium w-16">순서</th>
              <th className="text-left px-4 py-3 font-medium">유형</th>
              <th className="text-left px-4 py-3 font-medium">이름</th>
              <th className="text-right px-4 py-3 font-medium">단가</th>
              <th className="text-center px-4 py-3 font-medium w-20">상태</th>
              <th className="text-center px-4 py-3 font-medium w-24">관리</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted-foreground">
                  등록된 상품이 없습니다.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="px-4 py-3 text-muted-foreground">{p.sortOrder}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.dbType}</td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-right">{p.price.toLocaleString()}원</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      p.isActive
                        ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                    }`}>
                      {p.isActive ? "활성" : "비활성"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(p)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 상품 추가/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "상품 수정" : "상품 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="prod-dbtype">유형 (DB 타입)</Label>
              <Input
                id="prod-dbtype"
                value={form.dbType}
                onChange={(e) => setForm((p) => ({ ...p, dbType: e.target.value }))}
                placeholder="예: 실손, 종신"
              />
            </div>
            <div>
              <Label htmlFor="prod-name">상품명</Label>
              <Input
                id="prod-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="prod-price">단가 (원)</Label>
              <Input
                id="prod-price"
                type="number"
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label htmlFor="prod-desc">설명</Label>
              <Input
                id="prod-desc"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="prod-sort">정렬 순서</Label>
                <Input
                  id="prod-sort"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((p) => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm">활성</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
              <Button
                onClick={handleSubmit}
                disabled={!form.dbType.trim() || !form.name.trim() || form.price <= 0 || createProduct.isPending || updateProduct.isPending}
              >
                {(createProduct.isPending || updateProduct.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                {editing ? "수정" : "추가"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>상품 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" 상품을 삭제하시겠습니까?
              주문이 존재하는 상품은 삭제할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {deleteProduct.isPending ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
