import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddressInput } from "@/components/customers/AddressInput";
import { User, Mail, MapPin, ChevronLeft, Truck, Check, Loader2 } from "lucide-react";
import { PhoneInput } from "./CardInputs";
import { EditApplicantModal } from "./EditApplicantModal";
import { HeroHeader } from "./SuccessStep";
import type { Applicant } from "./constants";
import { PRICE_PER_SET } from "./constants";

interface Props {
  applicants: Applicant[];
  receiver: string;
  setReceiver: (v: string) => void;
  sPhone: string;
  setSPhone: (v: string) => void;
  sAddrBase: string;
  setSAddrBase: (v: string) => void;
  sAddrDetail: string;
  setSAddrDetail: (v: string) => void;
  sEmail: string;
  setSEmail: (v: string) => void;
  isSending: boolean;
  onBack: () => void;
  onSubmit: () => void;
  onUsePrevious: (index: number) => void;
  // Edit modal
  editModalOpen: boolean;
  editingIndex: number | null;
  onEditApplicant: (index: number) => void;
  onUpdateApplicant: (updated: Applicant) => void;
  onDeleteApplicant: () => void;
  onCloseEditModal: () => void;
}

export function ShippingStep({
  applicants,
  receiver,
  setReceiver,
  sPhone,
  setSPhone,
  sAddrBase,
  setSAddrBase,
  sAddrDetail,
  setSAddrDetail,
  sEmail,
  setSEmail,
  isSending,
  onBack,
  onSubmit,
  onUsePrevious,
  editModalOpen,
  editingIndex,
  onEditApplicant,
  onUpdateApplicant,
  onDeleteApplicant,
  onCloseEditModal,
}: Props) {
  const totalQty = applicants.reduce((sum, a) => sum + a.qty, 0);
  const deliveryFee = totalQty === 1 ? 3000 : 0;
  const totalPrice = totalQty * PRICE_PER_SET + deliveryFee;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <HeroHeader />

      {/* Order summary */}
      <div className="border rounded-lg p-5 space-y-4">
        <h3 className="font-bold flex items-center gap-2">
          <Check className="w-5 h-5 text-green-600" /> 주문 내용 확인
        </h3>
        <div className="space-y-2">
          {applicants.map((a, idx) => (
            <div
              key={idx}
              onClick={() => onEditApplicant(idx)}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs font-bold">
                  {idx + 1}
                </span>
                <div>
                  <p className="font-bold text-sm">{a.name} ({a.designLabel})</p>
                  <p className="text-xs text-muted-foreground">{a.grade} / {a.branch}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{a.qty}세트</span>
                <span className="text-xs text-muted-foreground">수정</span>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t pt-3 flex justify-between items-center">
          <span className="text-lg font-bold">최종 결제 금액</span>
          <span className="text-xl font-bold">{totalPrice.toLocaleString()}원</span>
        </div>
      </div>

      {/* Shipping form */}
      <div className="border rounded-lg p-5 space-y-5">
        <div className="flex justify-between items-center">
          <h3 className="font-bold flex items-center gap-2">
            <Truck className="w-5 h-5" /> 배송지 정보
          </h3>
          {applicants.length > 0 && (
            <select
              onChange={(e) => {
                const idx = parseInt(e.target.value);
                if (!isNaN(idx)) {
                  onUsePrevious(idx);
                  e.target.value = "";
                }
              }}
              defaultValue=""
              className="px-3 py-1.5 text-sm font-medium border rounded-lg bg-primary text-primary-foreground cursor-pointer"
            >
              <option value="" disabled>신청자 정보로 채우기</option>
              {applicants.map((a, idx) => (
                <option key={idx} value={idx} className="bg-background text-foreground">
                  {idx + 1}. {a.name} ({a.grade})
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="text-sm font-bold flex items-center gap-2 mb-1.5">
            <User className="h-4 w-4" /> 받으시는 분 *
          </label>
          <Input value={receiver} onChange={(e) => setReceiver(e.target.value)} placeholder="성함을 입력하세요" />
        </div>

        <PhoneInput label="연락처 *" value={sPhone} setValue={setSPhone} />

        <div className="space-y-2">
          <label className="text-sm font-bold flex items-center gap-2">
            <MapPin className="h-4 w-4" /> 배송 주소 *
          </label>
          <AddressInput value={sAddrBase} onChange={setSAddrBase} placeholder="주소 검색" />
          <Input value={sAddrDetail} onChange={(e) => setSAddrDetail(e.target.value)} placeholder="상세주소를 입력하세요" />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-bold flex items-center gap-2">
            <Mail className="h-4 w-4" /> 주문 확인용 이메일 *
          </label>
          <Input type="email" value={sEmail} onChange={(e) => setSEmail(e.target.value)} placeholder="example@gmail.com" />
          <p className="text-xs text-muted-foreground">
            * 위 메일 주소로 주문 확인 메일이 자동 발신됩니다.
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" /> 이전
        </Button>
        <Button onClick={onSubmit} disabled={isSending} size="lg">
          {isSending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {isSending ? "주문 처리 중..." : "최종 주문 및 결제 확인"}
        </Button>
      </div>

      <EditApplicantModal
        isOpen={editModalOpen}
        applicant={editingIndex !== null ? applicants[editingIndex] : null}
        onClose={onCloseEditModal}
        onSave={onUpdateApplicant}
        onDelete={onDeleteApplicant}
      />
    </div>
  );
}
