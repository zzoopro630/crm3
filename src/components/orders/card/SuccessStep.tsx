import { Button } from "@/components/ui/button";
import { Check, CreditCard, Truck, Package } from "lucide-react";
import type { Applicant, OrderResult } from "./constants";

interface Props {
  orderResult: OrderResult;
  applicants: Applicant[];
  onRestart: () => void;
}

function HeroHeader() {
  return (
    <div
      className="relative w-full h-40 sm:h-48 md:h-56 bg-cover bg-center rounded-lg overflow-hidden mb-8"
      style={{ backgroundImage: "url('/card-designs/main.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 flex items-center justify-center h-full gap-3 sm:gap-4">
        <img
          src="/card-designs/thelogo.svg"
          alt="logo"
          className="h-10 sm:h-12 md:h-14 brightness-0 invert"
        />
        <div className="flex flex-col items-start">
          <span
            className="text-base sm:text-lg italic text-white/80"
            style={{ fontFamily: "'Caveat Brush', cursive" }}
          >
            Be the First!
          </span>
          <span
            className="text-3xl sm:text-4xl md:text-5xl text-white"
            style={{ fontFamily: "'Paperlogy', sans-serif", fontWeight: 800, lineHeight: 1 }}
          >
            명함 신청
          </span>
        </div>
      </div>
    </div>
  );
}

export { HeroHeader };

export function SuccessStep({ orderResult, applicants, onRestart }: Props) {
  return (
    <div className="max-w-2xl mx-auto py-8 space-y-8">
      <HeroHeader />
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full">
          <Check className="w-12 h-12 text-green-600" strokeWidth={3} />
        </div>
        <h2 className="text-2xl font-bold">
          주문이 정상적으로 접수되었습니다!
        </h2>
        <div className="text-muted-foreground space-y-1">
          <p>
            <strong className="text-foreground">{orderResult.recipientName}</strong>
            님, 감사합니다.
          </p>
          <p>
            입금 확인 후 영업일 기준{" "}
            <strong className="text-foreground">5~7일</strong> 이내에 배송 완료됩니다.
          </p>
        </div>
      </div>

      {/* Payment info */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-xl p-8 text-center shadow-xl">
        <div className="flex items-center justify-center gap-2 mb-4">
          <CreditCard className="w-6 h-6 text-yellow-400" />
          <h3 className="text-lg font-bold text-gray-300">입금 계좌 안내</h3>
        </div>
        <div className="text-2xl font-bold mb-2 tracking-wide">
          카카오뱅크 3333-322-537940
        </div>
        <div className="text-lg font-bold text-gray-300">
          예금주: 송낙주(영업지원팀)
        </div>
      </div>

      {/* Shipping info */}
      <div className="border rounded-lg p-5 space-y-4">
        <h3 className="font-bold flex items-center gap-2">
          <Truck className="h-5 w-5 text-blue-600" /> 배송 정보
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex gap-3">
            <span className="text-muted-foreground w-16 shrink-0">받는 분</span>
            <span className="font-medium">{orderResult.recipientName}</span>
          </div>
          <div className="flex gap-3">
            <span className="text-muted-foreground w-16 shrink-0">연락처</span>
            <span className="font-medium">{orderResult.recipientPhone}</span>
          </div>
          <div className="flex gap-3">
            <span className="text-muted-foreground w-16 shrink-0">주소</span>
            <span className="font-medium">{orderResult.recipientAddress}</span>
          </div>
        </div>
      </div>

      {/* Order details */}
      <div className="border rounded-lg p-5 space-y-4">
        <h3 className="font-bold flex items-center gap-2">
          <Package className="h-5 w-5 text-purple-600" /> 신청 내역
        </h3>
        <div className="space-y-2">
          {applicants.map((a, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-7 h-7 bg-primary text-primary-foreground rounded-full text-xs font-bold">
                  {i + 1}
                </span>
                <div>
                  <p className="font-bold text-sm">{a.name} ({a.grade})</p>
                  <p className="text-xs text-muted-foreground">{a.designLabel}, {a.cardType}</p>
                </div>
              </div>
              <span className="font-bold">{a.qty}세트</span>
            </div>
          ))}
        </div>
        <div className="border-t pt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">상품 금액</span>
            <span className="font-medium">
              {(orderResult.totalAmount - orderResult.deliveryFee).toLocaleString()}원
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">배송비</span>
            <span className="font-medium">{orderResult.deliveryFee.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between text-lg pt-2 border-t">
            <span className="font-bold">총 결제 금액</span>
            <span className="font-bold">{orderResult.totalAmount.toLocaleString()}원</span>
          </div>
        </div>
      </div>

      <Button onClick={onRestart} className="w-full" size="lg">
        새 주문하기
      </Button>
    </div>
  );
}
