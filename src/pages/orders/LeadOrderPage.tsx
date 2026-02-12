import { useState, useCallback } from "react";
import { useLeadProducts, useCreateOrder } from "@/hooks/useOrders";
import { useAuthStore } from "@/stores/authStore";
import { Loader2 } from "lucide-react";
import ProductSelectionStep from "@/components/orders/ProductSelectionStep";
import ApplicantFormStep from "@/components/orders/ApplicantFormStep";
import OrderConfirmation from "@/components/orders/OrderConfirmation";
import type { LeadProduct, CreateOrderInput } from "@/types/order";
import type { CartItem, ApplicantInfo } from "@/components/orders/types";

type Step = "products" | "info" | "confirm";

export default function LeadOrderPage() {
  const { data: products = [], isLoading } = useLeadProducts();
  const createOrder = useCreateOrder();
  const { employee } = useAuthStore();

  const [step, setStep] = useState<Step>("products");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selections, setSelections] = useState<Record<string, boolean>>({});
  const [orderResult, setOrderResult] = useState<{
    id: number;
    totalAmount: number;
  } | null>(null);

  // 로그인 사용자 정보로 자동채움
  const defaultInfo: ApplicantInfo = {
    name: employee?.fullName || "",
    affiliation: employee?.department || "",
    position: employee?.positionName || "",
    phone: "010-",
    email: employee?.email || "",
  };

  const handleCheckboxChange = useCallback(
    (productId: number, product: LeadProduct, region: string, checked: boolean) => {
      const key = `${productId}-${region}`;
      if (checked) {
        setCart((prev) => [
          ...prev,
          { cartKey: key, productId, product, region, quantity: 1 },
        ]);
        setSelections((prev) => ({ ...prev, [key]: true }));
      } else {
        setCart((prev) => prev.filter((item) => item.cartKey !== key));
        setSelections((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    },
    []
  );

  const handleQuantityChange = useCallback(
    (cartKey: string, quantity: number) => {
      setCart((prev) =>
        prev.map((item) =>
          item.cartKey === cartKey ? { ...item, quantity } : item
        )
      );
    },
    []
  );

  const handleRemoveItem = useCallback((cartKey: string) => {
    setCart((prev) => prev.filter((item) => item.cartKey !== cartKey));
    setSelections((prev) => {
      const next = { ...prev };
      delete next[cartKey];
      return next;
    });
  }, []);

  const handleSubmit = async (info: ApplicantInfo) => {
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

  const handleRestart = () => {
    setOrderResult(null);
    setCart([]);
    setSelections({});
    setStep("products");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (step === "confirm" && orderResult) {
    return (
      <OrderConfirmation
        orderId={orderResult.id}
        totalAmount={orderResult.totalAmount}
        onRestart={handleRestart}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">DB 신청</h1>
        <p className="text-sm text-muted-foreground mt-1">
          간편하고 빠른 DB 신청 서비스
        </p>
      </div>

      {step === "products" && (
        <ProductSelectionStep
          products={products}
          cart={cart}
          selections={selections}
          onCheckboxChange={handleCheckboxChange}
          onQuantityChange={handleQuantityChange}
          onRemoveItem={handleRemoveItem}
          onNext={() => setStep("info")}
        />
      )}

      {step === "info" && (
        <ApplicantFormStep
          cart={cart}
          defaultInfo={defaultInfo}
          onQuantityChange={handleQuantityChange}
          onRemoveItem={handleRemoveItem}
          onBack={() => setStep("products")}
          onSubmit={handleSubmit}
          isSubmitting={createOrder.isPending}
        />
      )}
    </div>
  );
}
