import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { BANK_ACCOUNT } from "./constants";

interface OrderConfirmationProps {
  orderId: number;
  totalAmount: number;
  onRestart: () => void;
}

export default function OrderConfirmation({
  orderId,
  totalAmount,
  onRestart,
}: OrderConfirmationProps) {
  return (
    <div className="max-w-lg mx-auto text-center py-12 space-y-6">
      <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
      <h2 className="text-2xl font-bold">신청 완료!</h2>
      <p className="text-muted-foreground">
        신청이 정상적으로 접수되었습니다.
        <br />
        확인 후 담당자가 개별 연락드리겠습니다.
      </p>
      <p className="text-muted-foreground">
        주문번호:{" "}
        <span className="font-mono font-bold">#{orderId}</span>
      </p>
      <p className="text-lg font-semibold">
        합계: {totalAmount.toLocaleString()}원
      </p>

      <div className="bg-muted/50 p-4 rounded-lg border text-left">
        <h4 className="font-semibold mb-1">DB 입금계좌</h4>
        <p className="text-sm">
          {BANK_ACCOUNT.bank} {BANK_ACCOUNT.number} {BANK_ACCOUNT.holder}
        </p>
        <p className="text-sm font-semibold mt-1">
          담당자가 수량 확인 및 입금안내 드릴 예정입니다.
        </p>
      </div>

      <Button onClick={onRestart} variant="outline">
        새로 신청하기
      </Button>
    </div>
  );
}
