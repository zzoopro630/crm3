import { useState } from "react";
import { useLeadProducts, useCreateOrder } from "@/hooks/useOrders";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShoppingCart, User, CheckCircle, ArrowLeft, ArrowRight, Minus, Plus } from "lucide-react";
import type { LeadProduct, CreateOrderInput } from "@/types/order";

type Step = "products" | "info" | "confirm";

interface CartItem {
  productId: number;
  product: LeadProduct;
  region: string;
  quantity: number;
}

export default function LeadOrderPage() {
  const { data: products = [], isLoading } = useLeadProducts();
  const createOrder = useCreateOrder();
  const { employee } = useAuthStore();

  const [step, setStep] = useState<Step>("products");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [info, setInfo] = useState({
    name: employee?.fullName || "",
    affiliation: "",
    position: "",
    phone: "",
    email: employee?.email || "",
  });
  const [orderResult, setOrderResult] = useState<{ id: number; totalAmount: number } | null>(null);

  // 상품을 dbType으로 그룹핑
  const groupedProducts = products.reduce<Record<string, LeadProduct[]>>((acc, p) => {
    (acc[p.dbType] = acc[p.dbType] || []).push(p);
    return acc;
  }, {});

  const addToCart = (product: LeadProduct) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === product.id && !c.region);
      if (existing) {
        return prev.map((c) =>
          c === existing ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { productId: product.id, product, region: "", quantity: 1 }];
    });
  };

  const updateCartItem = (index: number, updates: Partial<CartItem>) => {
    setCart((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  const removeCartItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const handleSubmit = async () => {
    const input: CreateOrderInput = {
      name: info.name,
      affiliation: info.affiliation || undefined,
      position: info.position || undefined,
      phone: info.phone || undefined,
      email: info.email || undefined,
      items: cart.map((c) => ({
        productId: c.productId,
        region: c.region || undefined,
        quantity: c.quantity,
      })),
    };

    try {
      const result = await createOrder.mutateAsync(input);
      setOrderResult({ id: result.id, totalAmount: result.totalAmount });
      setStep("confirm");
    } catch {
      // 에러는 mutation에서 처리
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 완료 화면
  if (orderResult && step === "confirm") {
    return (
      <div className="max-w-lg mx-auto text-center py-12 space-y-4">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
        <h2 className="text-xl font-bold">주문이 접수되었습니다</h2>
        <p className="text-muted-foreground">
          주문번호: <span className="font-mono font-bold">#{orderResult.id}</span>
        </p>
        <p className="text-lg font-semibold">
          합계: {orderResult.totalAmount.toLocaleString()}원
        </p>
        <Button
          onClick={() => {
            setOrderResult(null);
            setCart([]);
            setStep("products");
          }}
          variant="outline"
        >
          새 주문하기
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">보험 리드 주문</h1>
        <p className="text-sm text-muted-foreground">상품을 선택하고 주문 정보를 입력하세요.</p>
      </div>

      {/* 스텝 인디케이터 */}
      <div className="flex items-center gap-2 text-sm">
        {[
          { key: "products" as Step, label: "상품 선택", icon: ShoppingCart },
          { key: "info" as Step, label: "신청자 정보", icon: User },
        ].map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            {i > 0 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
            <button
              onClick={() => setStep(s.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                step === s.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <s.icon className="h-3.5 w-3.5" />
              {s.label}
            </button>
          </div>
        ))}
      </div>

      {/* Step 1: 상품 선택 */}
      {step === "products" && (
        <div className="space-y-6">
          {Object.entries(groupedProducts).map(([dbType, prods]) => (
            <div key={dbType} className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {dbType}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {prods.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors text-left"
                  >
                    <div>
                      <div className="font-medium text-sm">{product.name}</div>
                      {product.description && (
                        <div className="text-xs text-muted-foreground mt-0.5">{product.description}</div>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-primary ml-2 whitespace-nowrap">
                      {product.price.toLocaleString()}원
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* 장바구니 */}
          {cart.length > 0 && (
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                선택 항목 ({cart.length})
              </h3>
              {cart.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <div className="flex-1">
                    <span className="font-medium">{item.product.name}</span>
                    <span className="text-muted-foreground ml-2">
                      @{item.product.price.toLocaleString()}원
                    </span>
                  </div>
                  <Input
                    value={item.region}
                    onChange={(e) => updateCartItem(idx, { region: e.target.value })}
                    placeholder="지역"
                    className="w-24 h-8 text-xs"
                  />
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        item.quantity > 1
                          ? updateCartItem(idx, { quantity: item.quantity - 1 })
                          : removeCartItem(idx)
                      }
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateCartItem(idx, { quantity: item.quantity + 1 })}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="w-24 text-right font-medium">
                    {(item.product.price * item.quantity).toLocaleString()}원
                  </span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 border-t font-semibold">
                <span>합계</span>
                <span className="text-lg">{totalAmount.toLocaleString()}원</span>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={() => setStep("info")} disabled={cart.length === 0}>
              다음 <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: 신청자 정보 */}
      {step === "info" && (
        <div className="space-y-4 max-w-md">
          <div>
            <Label htmlFor="order-name">이름 *</Label>
            <Input
              id="order-name"
              value={info.name}
              onChange={(e) => setInfo((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="order-affiliation">소속</Label>
            <Input
              id="order-affiliation"
              value={info.affiliation}
              onChange={(e) => setInfo((p) => ({ ...p, affiliation: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="order-position">직급</Label>
            <Input
              id="order-position"
              value={info.position}
              onChange={(e) => setInfo((p) => ({ ...p, position: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="order-phone">연락처</Label>
            <Input
              id="order-phone"
              value={info.phone}
              onChange={(e) => setInfo((p) => ({ ...p, phone: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="order-email">이메일</Label>
            <Input
              id="order-email"
              type="email"
              value={info.email}
              onChange={(e) => setInfo((p) => ({ ...p, email: e.target.value }))}
            />
          </div>

          {/* 주문 요약 */}
          <div className="border rounded-lg p-4 space-y-2 text-sm">
            <h4 className="font-semibold">주문 요약</h4>
            {cart.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span>
                  {item.product.name} {item.region && `(${item.region})`} x{item.quantity}
                </span>
                <span>{(item.product.price * item.quantity).toLocaleString()}원</span>
              </div>
            ))}
            <div className="flex justify-between font-bold pt-2 border-t">
              <span>합계</span>
              <span>{totalAmount.toLocaleString()}원</span>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("products")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> 이전
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!info.name.trim() || createOrder.isPending}
            >
              {createOrder.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              주문 제출
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
