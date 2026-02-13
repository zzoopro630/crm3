import { useState, useCallback } from "react";
import { useCreateCardOrder } from "@/hooks/useCardOrders";
import { useAuthStore } from "@/stores/authStore";
import { useOrganizations } from "@/hooks/useOrganizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AddressInput } from "@/components/customers/AddressInput";
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
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Pencil,
  Plus,
  CheckCircle2,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CreateCardOrderInput } from "@/types/cardOrder";

type Step = "design" | "info" | "shipping";
type CardType = "로고형" | "전화번호형";

const UNIT_PRICE = 12000;

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

interface ApplicantForm {
  design: number;
  cardType: CardType;
  name: string;
  grade: string;
  branch: string;
  phone: string;
  email: string;
  fax: string;
  addrBase: string;
  addrDetail: string;
  request: string;
  qty: number;
}

const emptyApplicant = (design: number, cardType: CardType): ApplicantForm => ({
  design,
  cardType,
  name: "",
  grade: "",
  branch: "",
  phone: "",
  email: "",
  fax: "",
  addrBase: "",
  addrDetail: "",
  request: "",
  qty: 1,
});

export default function CardOrderPage() {
  const createOrder = useCreateCardOrder();
  const { employee } = useAuthStore();
  const { data: organizations = [] } = useOrganizations();

  const [step, setStep] = useState<Step>("design");
  const [selectedDesign, setSelectedDesign] = useState<number>(1);
  const [cardType, setCardType] = useState<CardType>("로고형");
  const [applicants, setApplicants] = useState<ApplicantForm[]>([]);
  const [currentForm, setCurrentForm] = useState<ApplicantForm | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  // 배송지
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");

  // 결과
  const [orderResult, setOrderResult] = useState<{ id: number; totalAmount: number } | null>(null);

  // 사원의 지사 이름
  const employeeOrg = employee?.organizationId
    ? organizations.find((o) => o.id === employee.organizationId)?.name || ""
    : "";

  const initForm = useCallback(() => {
    const form = emptyApplicant(selectedDesign, cardType);
    form.name = employee?.fullName || "";
    form.grade = employee?.positionName || "";
    form.branch = employeeOrg;
    return form;
  }, [selectedDesign, cardType, employee, employeeOrg]);

  const handleAddApplicant = () => {
    setCurrentForm(initForm());
    setEditingIndex(null);
  };

  const handleEditApplicant = (index: number) => {
    setCurrentForm({ ...applicants[index] });
    setEditingIndex(index);
  };

  const handleSaveApplicant = () => {
    if (!currentForm || !currentForm.name.trim()) return;
    if (editingIndex !== null) {
      setApplicants((prev) =>
        prev.map((a, i) => (i === editingIndex ? currentForm : a))
      );
    } else {
      setApplicants((prev) => [...prev, currentForm]);
    }
    setCurrentForm(null);
    setEditingIndex(null);
  };

  const handleDeleteApplicant = () => {
    if (deleteTarget === null) return;
    setApplicants((prev) => prev.filter((_, i) => i !== deleteTarget));
    setDeleteTarget(null);
  };

  const fillRecipientFromFirst = () => {
    if (applicants.length === 0) return;
    const first = applicants[0];
    setRecipientName(first.name);
    setRecipientPhone(first.phone);
    setRecipientAddress(first.addrBase + (first.addrDetail ? " " + first.addrDetail : ""));
    setRecipientEmail(first.email);
  };

  const totalQty = applicants.reduce((sum, a) => sum + a.qty, 0);
  const totalAmount = totalQty * UNIT_PRICE;

  const handleSubmit = async () => {
    const input: CreateCardOrderInput = {
      applicants: applicants.map((a) => ({
        design: a.design,
        cardType: a.cardType,
        name: a.name,
        grade: a.grade || undefined,
        branch: a.branch || undefined,
        phone: a.phone || undefined,
        email: a.email || undefined,
        fax: a.fax || undefined,
        addrBase: a.addrBase || undefined,
        addrDetail: a.addrDetail || undefined,
        request: a.request || undefined,
        qty: a.qty,
      })),
      recipient: {
        name: recipientName || undefined,
        phone: recipientPhone || undefined,
        address: recipientAddress || undefined,
        email: recipientEmail || undefined,
      },
    };

    try {
      const result = await createOrder.mutateAsync(input);
      setOrderResult({ id: result.id, totalAmount: result.totalAmount });
    } catch {
      // mutation 에러 처리
    }
  };

  const handleRestart = () => {
    setOrderResult(null);
    setApplicants([]);
    setStep("design");
    setSelectedDesign(1);
    setCardType("로고형");
    setRecipientName("");
    setRecipientPhone("");
    setRecipientAddress("");
    setRecipientEmail("");
  };

  // 완료 화면
  if (orderResult) {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-6">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
        <div>
          <h2 className="text-2xl font-bold">명함 신청 완료</h2>
          <p className="text-muted-foreground mt-2">주문번호: #{orderResult.id}</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
          <p className="font-semibold">입금 안내</p>
          <p>카카오뱅크 3333-322-537940</p>
          <p className="font-bold text-lg">{orderResult.totalAmount.toLocaleString()}원</p>
          <p className="text-muted-foreground">담당자가 확인 후 개별 연락드리겠습니다.</p>
        </div>
        <Button onClick={handleRestart} variant="outline">
          새 주문하기
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
          <CreditCard className="h-6 w-6" /> 명함 신청
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          디자인을 선택하고 정보를 입력하세요
        </p>
      </div>

      {/* 스텝 인디케이터 */}
      <div className="flex items-center justify-center gap-2 text-sm">
        {(["design", "info", "shipping"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <span
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium",
                step === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {i + 1}. {s === "design" ? "디자인" : s === "info" ? "신청자 정보" : "배송지"}
            </span>
          </div>
        ))}
      </div>

      {/* Step 1: 디자인 선택 */}
      {step === "design" && (
        <DesignStep
          selectedDesign={selectedDesign}
          cardType={cardType}
          onSelectDesign={setSelectedDesign}
          onSelectType={setCardType}
          onNext={() => {
            handleAddApplicant();
            setStep("info");
          }}
        />
      )}

      {/* Step 2: 신청자 정보 */}
      {step === "info" && (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* 신청자 목록 */}
          {applicants.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">주문 내역 ({applicants.length}건)</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left px-3 py-2 font-medium">시안</th>
                      <th className="text-left px-3 py-2 font-medium">이름</th>
                      <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">직급</th>
                      <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">지사</th>
                      <th className="text-center px-3 py-2 font-medium">수량</th>
                      <th className="text-center px-3 py-2 font-medium w-20">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applicants.map((a, i) => (
                      <tr key={i} className="border-b last:border-b-0">
                        <td className="px-3 py-2 text-xs">
                          {DESIGN_LABELS[a.design]} / {a.cardType}
                        </td>
                        <td className="px-3 py-2 font-medium">{a.name}</td>
                        <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{a.grade || "-"}</td>
                        <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{a.branch || "-"}</td>
                        <td className="px-3 py-2 text-center">{a.qty}</td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditApplicant(i)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(i)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-right text-sm font-medium">
                합계: {totalQty}세트 / {totalAmount.toLocaleString()}원
              </div>
            </div>
          )}

          {/* 현재 편집 중인 신청자 폼 */}
          {currentForm && (
            <ApplicantFormDialog
              form={currentForm}
              onChange={setCurrentForm}
              onSave={handleSaveApplicant}
              onCancel={() => { setCurrentForm(null); setEditingIndex(null); }}
              isEditing={editingIndex !== null}
            />
          )}

          {/* 추가/다음 버튼 */}
          {!currentForm && (
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep("design")}>
                <ChevronLeft className="h-4 w-4 mr-1" /> 디자인 변경
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleAddApplicant}>
                  <Plus className="h-4 w-4 mr-1" /> 추가 신청
                </Button>
                <Button onClick={() => setStep("shipping")} disabled={applicants.length === 0}>
                  배송지 입력 <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* 삭제 확인 */}
          <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>신청자 삭제</AlertDialogTitle>
                <AlertDialogDescription>
                  이 신청자를 삭제하시겠습니까?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteApplicant}>삭제</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Step 3: 배송지 */}
      {step === "shipping" && (
        <div className="max-w-lg mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">배송지 정보</h3>
            <Button variant="link" size="sm" onClick={fillRecipientFromFirst} className="text-xs">
              첫 번째 신청자 정보로 채우기
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <Label>받는 분</Label>
              <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="받는 분 성함" />
            </div>
            <div>
              <Label>연락처</Label>
              <Input value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} placeholder="010-0000-0000" />
            </div>
            <div>
              <Label>배송 주소</Label>
              <AddressInput value={recipientAddress} onChange={setRecipientAddress} placeholder="주소 검색" />
            </div>
            <div>
              <Label>이메일 (주문 확인 발송용)</Label>
              <Input value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="email@example.com" type="email" />
            </div>
          </div>

          {/* 주문 요약 */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
            <h4 className="font-semibold">주문 요약</h4>
            {applicants.map((a, i) => (
              <div key={i} className="flex justify-between">
                <span>{a.name} - {DESIGN_LABELS[a.design]} ({a.cardType})</span>
                <span>{a.qty}세트</span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2 flex justify-between font-bold">
              <span>합계 ({totalQty}세트)</span>
              <span>{totalAmount.toLocaleString()}원</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep("info")}>
              <ChevronLeft className="h-4 w-4 mr-1" /> 이전
            </Button>
            <Button onClick={handleSubmit} disabled={createOrder.isPending || applicants.length === 0}>
              {createOrder.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              주문하기
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ 디자인 선택 ============
function DesignStep({
  selectedDesign,
  cardType,
  onSelectDesign,
  onSelectType,
  onNext,
}: {
  selectedDesign: number;
  cardType: CardType;
  onSelectDesign: (d: number) => void;
  onSelectType: (t: CardType) => void;
  onNext: () => void;
}) {
  const typeIndex = cardType === "로고형" ? 1 : 2;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 카드 유형 토글 */}
      <div className="flex justify-center gap-2">
        {(["로고형", "전화번호형"] as CardType[]).map((t) => (
          <Button
            key={t}
            variant={cardType === t ? "default" : "outline"}
            size="sm"
            onClick={() => onSelectType(t)}
          >
            {t}
          </Button>
        ))}
      </div>

      {/* 가로형 시안 (1-6) */}
      <div>
        <p className="text-sm text-muted-foreground mb-2">가로형</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((d) => (
            <button
              key={d}
              onClick={() => onSelectDesign(d)}
              className={cn(
                "border-2 rounded-lg overflow-hidden transition-all",
                selectedDesign === d
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-primary/50"
              )}
            >
              <img
                src={`/card-designs/${d}-${typeIndex}.png`}
                alt={DESIGN_LABELS[d]}
                className="w-full aspect-[9/5] object-cover"
              />
              <div className="px-2 py-1.5 text-xs font-medium text-center bg-muted/50">
                {DESIGN_LABELS[d]}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 세로형 시안 (7-9) */}
      <div>
        <p className="text-sm text-muted-foreground mb-2">세로형</p>
        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
          {[7, 8, 9].map((d) => (
            <button
              key={d}
              onClick={() => onSelectDesign(d)}
              className={cn(
                "border-2 rounded-lg overflow-hidden transition-all",
                selectedDesign === d
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-primary/50"
              )}
            >
              <img
                src={`/card-designs/${d}-${typeIndex}.png`}
                alt={DESIGN_LABELS[d]}
                className="w-full aspect-[5/9] object-cover"
              />
              <div className="px-2 py-1.5 text-xs font-medium text-center bg-muted/50">
                {DESIGN_LABELS[d]}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-center">
        <Button onClick={onNext}>
          신청자 정보 입력 <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ============ 신청자 폼 다이얼로그 ============
function ApplicantFormDialog({
  form,
  onChange,
  onSave,
  onCancel,
  isEditing,
}: {
  form: ApplicantForm;
  onChange: (f: ApplicantForm) => void;
  onSave: () => void;
  onCancel: () => void;
  isEditing: boolean;
}) {
  const update = (key: keyof ApplicantForm, value: string | number) =>
    onChange({ ...form, [key]: value });

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "신청자 수정" : "신청자 정보 입력"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="bg-muted/50 rounded px-3 py-2 text-sm">
            <span className="font-medium">{DESIGN_LABELS[form.design]}</span> / {form.cardType}
          </div>

          {/* 디자인/유형 변경 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">시안 변경</Label>
              <select
                className="w-full border rounded px-2 py-1.5 text-sm bg-background"
                value={form.design}
                onChange={(e) => update("design", parseInt(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                  <option key={d} value={d}>{DESIGN_LABELS[d]}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">유형 변경</Label>
              <select
                className="w-full border rounded px-2 py-1.5 text-sm bg-background"
                value={form.cardType}
                onChange={(e) => update("cardType", e.target.value)}
              >
                <option value="로고형">로고형</option>
                <option value="전화번호형">전화번호형</option>
              </select>
            </div>
          </div>

          <div>
            <Label className="text-xs">이름 *</Label>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="이름" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">직급</Label>
              <Input value={form.grade} onChange={(e) => update("grade", e.target.value)} placeholder="직급" />
            </div>
            <div>
              <Label className="text-xs">지사</Label>
              <Input value={form.branch} onChange={(e) => update("branch", e.target.value)} placeholder="지사" />
            </div>
          </div>
          <div>
            <Label className="text-xs">연락처</Label>
            <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="010-0000-0000" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">이메일</Label>
              <Input value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="이메일" />
            </div>
            <div>
              <Label className="text-xs">팩스</Label>
              <Input value={form.fax} onChange={(e) => update("fax", e.target.value)} placeholder="팩스 번호" />
            </div>
          </div>
          <div>
            <Label className="text-xs">주소</Label>
            <AddressInput value={form.addrBase} onChange={(v) => update("addrBase", v)} placeholder="주소 검색" />
          </div>
          <div>
            <Label className="text-xs">상세 주소</Label>
            <Input value={form.addrDetail} onChange={(e) => update("addrDetail", e.target.value)} placeholder="상세 주소" />
          </div>
          <div>
            <Label className="text-xs">요청사항</Label>
            <Textarea value={form.request} onChange={(e) => update("request", e.target.value)} placeholder="요청사항 (선택)" rows={2} />
          </div>
          <div>
            <Label className="text-xs">수량 (세트)</Label>
            <Input
              type="number"
              min={1}
              value={form.qty}
              onChange={(e) => update("qty", Math.max(1, parseInt(e.target.value) || 1))}
            />
            <p className="text-xs text-muted-foreground mt-1">1세트 = 200장, {UNIT_PRICE.toLocaleString()}원</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onCancel}>취소</Button>
            <Button onClick={onSave} disabled={!form.name.trim()}>
              {isEditing ? "수정" : "주문내역 담기"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
