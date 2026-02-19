import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddressInput } from "@/components/customers/AddressInput";
import { CardContainer, CardBody, CardItem } from "@/components/ui/3d-card";
import {
  Award,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NameInput, PhoneInput, FaxInput, EmailInput, QuantityInput } from "./CardInputs";
import { EditApplicantModal } from "./EditApplicantModal";
import { HeroHeader } from "./SuccessStep";
import type { Applicant, CardType } from "./constants";
import {
  DESIGN_LABELS,
  GRADE_OPTIONS,
  BRANCH_OPTIONS,
  PRICE_PER_SET,
  getCardImagePath,
} from "./constants";

interface Props {
  design: number | null;
  setDesign: (v: number | null) => void;
  cardType: CardType;
  setCardType: (v: CardType) => void;
  // Form
  name: string; setName: (v: string) => void;
  grade: string; setGrade: (v: string) => void;
  branch: string; setBranch: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  fax: string; setFax: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  addrBase: string; setAddrBase: (v: string) => void;
  addrDetail: string; setAddrDetail: (v: string) => void;
  request: string; setRequest: (v: string) => void;
  qty: string; setQty: (v: string) => void;
  errors: string[];
  showValidationMsg: boolean;
  // Applicants
  applicants: Applicant[];
  onAddApplicant: () => void;
  onGoShipping: () => void;
  // Edit modal
  editModalOpen: boolean;
  editingIndex: number | null;
  onEditApplicant: (index: number) => void;
  onUpdateApplicant: (updated: Applicant) => void;
  onDeleteApplicant: () => void;
  onCloseEditModal: () => void;
}

export function OrderStep({
  design, setDesign,
  cardType, setCardType,
  name, setName,
  grade, setGrade,
  branch, setBranch,
  phone, setPhone,
  fax, setFax,
  email, setEmail,
  addrBase, setAddrBase,
  addrDetail, setAddrDetail,
  request, setRequest,
  qty, setQty,
  errors,
  showValidationMsg,
  applicants,
  onAddApplicant,
  onGoShipping,
  editModalOpen,
  editingIndex,
  onEditApplicant,
  onUpdateApplicant,
  onDeleteApplicant,
  onCloseEditModal,
}: Props) {
  // Carousel
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);

  const onDragStart = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setDragStartX(e.pageX - scrollRef.current.offsetLeft);
    setDragScrollLeft(scrollRef.current.scrollLeft);
  };
  const onDragEnd = () => setIsDragging(false);
  const onDragMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    scrollRef.current.scrollLeft = dragScrollLeft - (x - dragStartX) * 2;
  };
  const scrollCarousel = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 280;
    scrollRef.current.scrollTo({
      left: scrollRef.current.scrollLeft + (dir === "left" ? -amount : amount),
      behavior: "smooth",
    });
  };

  // Price
  const currentQty = qty ? Number(qty) : 0;
  const savedQty = applicants.reduce((sum, a) => sum + a.qty, 0);
  const totalQty = savedQty + currentQty;
  const deliveryFee = totalQty === 1 ? 3000 : 0;
  const productPrice = totalQty * PRICE_PER_SET;
  const totalPrice = productPrice + deliveryFee;

  return (
    <div className="overflow-hidden">
      <HeroHeader />
      <div className="grid lg:grid-cols-2 gap-6 lg:gap-12">
        {/* Left: Preview + Design */}
        <div className="space-y-6 min-w-0">
          {/* 3D Preview - 모바일에서 숨김, 시안 선택 후 컴팩트 표시 */}
          {design ? (
            <div className="hidden lg:block">
              <CardContainer containerClassName="py-0">
                <CardBody>
                  <CardItem translateZ={50}>
                    <img
                      key={`${design}-${cardType}`}
                      src={getCardImagePath(design, cardType)}
                      alt={`Design ${design}`}
                      className="max-h-[400px] object-contain rounded-sm"
                      style={{ filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.2))" }}
                    />
                  </CardItem>
                </CardBody>
              </CardContainer>
            </div>
          ) : (
            <div className={cn(
              "hidden lg:flex p-6 mx-auto items-center justify-center border rounded-lg transition-all",
              errors.includes("design") ? "border-red-500 shadow-red-100 shadow-lg" : "border-border"
            )}>
              <div className="text-center py-8">
                <CreditCard className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" strokeWidth={1.5} />
                <p className="text-muted-foreground font-medium">시안을 선택하면 이곳에 미리보기가 표시됩니다.</p>
              </div>
            </div>
          )}

          {/* 모바일 컴팩트 미리보기 */}
          {design ? (
            <div className="lg:hidden flex justify-center">
              <img
                key={`mobile-${design}-${cardType}`}
                src={getCardImagePath(design, cardType)}
                alt={`Design ${design}`}
                className="max-h-[200px] object-contain rounded-sm"
                style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.2))" }}
              />
            </div>
          ) : errors.includes("design") ? (
            <div className="lg:hidden p-3 border border-red-500 rounded-lg text-center">
              <p className="text-sm text-red-500 font-medium">시안을 선택해주세요</p>
            </div>
          ) : null}

          {/* Design carousel */}
          <div>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 bg-primary text-primary-foreground rounded-full text-sm">1</span>
              시안 선택 *
            </h3>
            <div className="relative group">
              <button onClick={() => scrollCarousel("left")} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/70 text-white rounded-full hidden lg:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div
                ref={scrollRef}
                onMouseDown={onDragStart}
                onMouseLeave={onDragEnd}
                onMouseUp={onDragEnd}
                onMouseMove={onDragMove}
                className="flex overflow-x-auto gap-4 pb-4 cursor-grab active:cursor-grabbing select-none snap-x snap-mandatory"
              >
                {DESIGN_LABELS.map((label, i) => {
                  const id = i + 1;
                  const active = design === id;
                  return (
                    <div
                      key={id}
                      onClick={() => setDesign(id)}
                      className={cn(
                        "relative flex-shrink-0 w-28 sm:w-40 md:w-52 lg:w-64 h-20 sm:h-28 md:h-36 lg:h-44 rounded-sm overflow-hidden border-2 transition-all cursor-pointer snap-center",
                        active ? "border-primary shadow-lg scale-105" : "border-border hover:border-primary/50 hover:shadow-md"
                      )}
                    >
                      <img src={`/card-designs/${id}-1.png`} alt={label} className="w-full h-full object-cover" />
                      {active && (
                        <div className="absolute top-2 right-2 bg-primary w-6 h-6 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-primary-foreground" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <button onClick={() => scrollCarousel("right")} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/70 text-white rounded-full hidden lg:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black">
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
            {design && (
              <p className="text-sm font-bold mt-3 bg-muted inline-block px-3 py-2 rounded-lg">
                ✓ <span className="text-blue-600 dark:text-blue-400">{DESIGN_LABELS[design - 1]}</span>
              </p>
            )}
          </div>

          {/* Type selection */}
          <div>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 bg-primary text-primary-foreground rounded-full text-sm">2</span>
              타입 선택 *
            </h3>
            <div className="inline-flex border rounded-full overflow-hidden">
              {(["로고형", "전화번호형"] as CardType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setCardType(t)}
                  className={cn(
                    "px-6 py-3 font-bold text-sm transition-all",
                    cardType === t ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            {design && cardType && (
              <p className="text-sm font-bold mt-3 bg-muted inline-block px-3 py-2 rounded-lg">
                ✓ <span className="text-blue-600 dark:text-blue-400">{DESIGN_LABELS[design - 1]}, {cardType}</span>
              </p>
            )}
          </div>
        </div>

        {/* Right: Applicant form */}
        <div className="space-y-6 min-w-0">
          <div className="border rounded-lg p-4 sm:p-6">
            <h2 className="text-xl font-bold mb-6">신청자 정보 입력</h2>
            <div className="space-y-5">
              <NameInput value={name} setValue={setName} isInvalid={errors.includes("name")} />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold flex items-center gap-2 mb-1.5">
                    <Award className="h-4 w-4" /> 직급 *
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className={cn("w-full h-10 px-3 border rounded-md bg-background text-sm", errors.includes("grade") && "border-red-500")}
                  >
                    <option value="">선택</option>
                    {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold flex items-center gap-2 mb-1.5">
                    <Building2 className="h-4 w-4" /> 지사 *
                  </label>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className={cn("w-full h-10 px-3 border rounded-md bg-background text-sm", errors.includes("branch") && "border-red-500")}
                  >
                    <option value="">선택</option>
                    {BRANCH_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PhoneInput label="연락처 *" value={phone} setValue={setPhone} isInvalid={errors.includes("phone")} />
                <FaxInput label="팩스 번호 (선택)" value={fax} setValue={setFax} />
              </div>

              <EmailInput value={email} setValue={setEmail} isInvalid={errors.includes("email")} />

              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> 사무실 주소 (선택)
                </label>
                <AddressInput value={addrBase} onChange={setAddrBase} placeholder="주소 검색" />
                <Input value={addrDetail} onChange={(e) => setAddrDetail(e.target.value)} placeholder="상세주소 입력 (선택)" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold">추가 요청사항</label>
                <textarea
                  value={request}
                  onChange={(e) => setRequest(e.target.value)}
                  placeholder="예) 주소 삭제 / 인스타그램 추가"
                  className="w-full px-3 py-2.5 border rounded-md bg-background text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <QuantityInput qty={qty} setQty={setQty} isInvalid={errors.includes("qty")} />

              {showValidationMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm font-medium text-red-600 dark:text-red-400">
                  ⚠️ 필수 입력 사항을 모두 입력해 주세요. (시안 및 타입 포함)
                </div>
              )}

              <Button onClick={onAddApplicant} className="w-full" size="lg">
                + 주문내역 담기
              </Button>
            </div>

            {/* Added applicants */}
            {applicants.length > 0 && (
              <div className="mt-6 p-4 bg-muted/50 border rounded-lg">
                <h4 className="font-bold mb-4 pb-3 border-b flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" /> 추가된 신청 내역 ({applicants.length})
                </h4>
                <div className="space-y-2">
                  {applicants.map((a, idx) => (
                    <div
                      key={idx}
                      onClick={() => onEditApplicant(idx)}
                      className="flex items-center gap-4 p-3 bg-background rounded-lg border hover:shadow-md hover:border-primary/50 transition-all cursor-pointer"
                    >
                      <img
                        src={getCardImagePath(a.design, a.cardType as CardType)}
                        alt={`Design ${a.design}`}
                        className="w-20 h-14 object-cover rounded-sm border"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{idx + 1}. {a.name} {a.grade}</p>
                        <p className="text-xs text-muted-foreground truncate">{a.designLabel}, {a.cardType} / {a.qty}세트</p>
                      </div>
                      <span className="text-xs text-muted-foreground">수정</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Price summary */}
            {totalQty > 0 && (
              <div className="mt-6 p-4 sm:p-6 bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-xl shadow-xl">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">총 수량</span>
                    <span className="font-bold">{totalQty}세트</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">상품 금액</span>
                    <span className="font-bold">{productPrice.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between pb-3 border-b border-gray-700">
                    <span className="text-gray-300">배송비</span>
                    <span className="font-bold">{deliveryFee.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between items-center text-lg pt-2">
                    <span className="font-bold">총 결제 예상 금액</span>
                    <span className="text-2xl font-bold text-yellow-400">{totalPrice.toLocaleString()}원</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Next step button - 모바일: fixed, 데스크톱: sticky */}
          <div className="fixed bottom-0 left-0 right-0 z-30 bg-background border-t p-3 lg:static lg:border-0 lg:p-0 lg:pt-2">
            <Button onClick={onGoShipping} className="w-full shadow-xl" size="lg">
              다음 단계 →
            </Button>
            <p className="hidden lg:block text-xs text-muted-foreground text-center mt-2">
              * 다음 단계에서 최종 주문 내용 확인 및 배송지 입력을 하실 수 있습니다.
            </p>
          </div>
          {/* 모바일 fixed 버튼 영역 확보 */}
          <div className="h-16 lg:hidden" />
        </div>
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
