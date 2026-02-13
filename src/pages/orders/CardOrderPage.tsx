import { useState, useRef, useEffect } from "react";
import { useCreateCardOrder } from "@/hooks/useCardOrders";
import { useAuthStore } from "@/stores/authStore";
import { useOrganizations } from "@/hooks/useOrganizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddressInput } from "@/components/customers/AddressInput";
import { CardContainer, CardBody, CardItem } from "@/components/ui/3d-card";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  Check,
  CreditCard,
  Award,
  ChevronLeft,
  ChevronRight,
  Printer,
  Truck,
  Loader2,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CreateCardOrderInput } from "@/types/cardOrder";

// ── 상수 ──

const DESIGN_LABELS = [
  "가로형1",
  "가로형2",
  "가로형3-블랙골드",
  "가로형4-블루실버",
  "가로형5-퍼플",
  "가로형6-화이트골드",
  "세로형1",
  "세로형2-블랙골드",
  "세로형3-화이트골드",
];

const PRICE_PER_SET = 12000;

const GRADE_OPTIONS = [
  "총괄이사",
  "사업단장",
  "지점장",
  "팀장",
  "설계사",
  "FC",
  "컨설턴트",
];

const BRANCH_OPTIONS = [
  "감동",
  "다올",
  "다원",
  "라온",
  "미르",
  "베스트",
  "센텀",
  "유럽",
  "윈윈",
  "직할",
  "캐슬",
  "해성",
];

// ── 타입 ──

type Step = "order" | "shipping" | "success";
type CardType = "로고형" | "전화번호형";

type Applicant = {
  design: number;
  designLabel: string;
  cardType: string;
  name: string;
  grade: string;
  branch: string;
  phone: string;
  email: string;
  request: string;
  qty: number;
  fax?: string;
  addrBase?: string;
  addrDetail?: string;
};

type OrderResult = {
  id: number;
  totalQty: number;
  deliveryFee: number;
  totalAmount: number;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
};

// ── 유틸 ──

const getCardImagePath = (designId: number, type: CardType) => {
  const suffix = type === "로고형" ? 1 : 2;
  return `/card-designs/${designId}-${suffix}.png`;
};

const formatPhone = (val: string) => {
  let digits = val.replace(/[^0-9]/g, "");
  if (digits.length > 0 && !digits.startsWith("010")) digits = "010" + digits;
  if (digits.length > 11) digits = digits.substring(0, 11);
  if (digits.length > 7)
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length > 3)
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return digits;
};

const formatFax = (val: string) => {
  let digits = val.replace(/[^0-9]/g, "");
  if (digits.length > 12) digits = digits.substring(0, 12);
  let areaLen = 3;
  if (digits.startsWith("02")) areaLen = 2;
  else if (digits.startsWith("050")) areaLen = 4;
  if (digits.length > areaLen + 4)
    return `${digits.slice(0, areaLen)}-${digits.slice(areaLen, areaLen + 4)}-${digits.slice(areaLen + 4)}`;
  if (digits.length > areaLen)
    return `${digits.slice(0, areaLen)}-${digits.slice(areaLen)}`;
  return digits;
};

// ── 입력 컴포넌트 ──

function NameInput({
  value,
  setValue,
  isInvalid,
}: {
  value: string;
  setValue: (v: string) => void;
  isInvalid?: boolean;
}) {
  const [showError, setShowError] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const onlyKorean = val.replace(
      /[^가-힣ㄱ-ㅎㅏ-ㅣ\u1100-\u11FF\u318D\u318E ]/g,
      ""
    );
    if (val !== onlyKorean) {
      setShowError(true);
      setTimeout(() => setShowError(false), 2000);
    }
    setValue(onlyKorean);
  };

  return (
    <div className="relative">
      <label className="text-sm font-bold flex items-center gap-2 mb-1.5">
        <User className="h-4 w-4" /> 이름 *
      </label>
      <Input
        value={value}
        onChange={handleChange}
        placeholder="이름을 입력하세요"
        className={cn(
          isInvalid && "border-red-500 focus-visible:ring-red-500"
        )}
      />
      {showError && (
        <p className="absolute -bottom-5 left-0 text-xs text-red-500 font-medium">
          이름은 한글로만 입력 가능합니다.
        </p>
      )}
    </div>
  );
}

function PhoneInput({
  label,
  value,
  setValue,
  isInvalid,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  isInvalid?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-bold flex items-center gap-2 mb-1.5">
        <Phone className="h-4 w-4" /> {label}
      </label>
      <Input
        value={value}
        onChange={(e) => setValue(formatPhone(e.target.value))}
        placeholder="010-0000-0000"
        maxLength={13}
        className={cn(
          isInvalid && "border-red-500 focus-visible:ring-red-500"
        )}
      />
    </div>
  );
}

function FaxInput({
  label,
  value,
  setValue,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-bold flex items-center gap-2 mb-1.5">
        <Printer className="h-4 w-4" /> {label}
      </label>
      <Input
        value={value}
        onChange={(e) => setValue(formatFax(e.target.value))}
        placeholder="0505-0000-0000"
        maxLength={14}
      />
    </div>
  );
}

function EmailInput({
  value,
  setValue,
  isInvalid,
}: {
  value: string;
  setValue: (v: string) => void;
  isInvalid?: boolean;
}) {
  const [showError, setShowError] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const noKorean = val.replace(/[가-힣ㄱ-ㅎㅏ-ㅣ]/g, "");
    if (val !== noKorean) {
      setShowError(true);
      setTimeout(() => setShowError(false), 2000);
    }
    setValue(noKorean);
  };

  return (
    <div className="relative">
      <label className="text-sm font-bold flex items-center gap-2 mb-1.5">
        <Mail className="h-4 w-4" /> 이메일 주소 (선택)
      </label>
      <Input
        type="email"
        value={value}
        onChange={handleChange}
        placeholder="example@gmail.com"
        className={cn(
          isInvalid && "border-red-500 focus-visible:ring-red-500"
        )}
      />
      {showError && (
        <p className="absolute -bottom-5 left-0 text-xs text-red-500 font-medium">
          이메일은 영어로만 입력해 주세요.
        </p>
      )}
    </div>
  );
}

function QuantityInput({
  qty,
  setQty,
  isInvalid,
}: {
  qty: string;
  setQty: (v: string) => void;
  isInvalid?: boolean;
}) {
  const current = qty ? Number(qty) : 0;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-bold">
        주문 수량{" "}
        <span className="text-muted-foreground font-normal">
          (1세트 200매 / 12,000원)
        </span>
      </label>
      <div
        className={cn(
          "inline-flex items-center border rounded overflow-hidden w-fit",
          isInvalid ? "border-red-500" : "border-border"
        )}
      >
        <button
          type="button"
          onClick={() => current > 1 && setQty(String(current - 1))}
          className="w-10 h-10 flex items-center justify-center bg-muted hover:bg-muted/70 transition-colors text-lg font-bold"
        >
          −
        </button>
        <input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="0"
          className={cn(
            "w-14 h-10 text-center text-lg font-bold border-0 focus:outline-none bg-background",
            isInvalid && "bg-red-50 dark:bg-red-900/20"
          )}
        />
        <button
          type="button"
          onClick={() => setQty(String(current + 1))}
          className="w-10 h-10 flex items-center justify-center bg-muted hover:bg-muted/70 transition-colors text-lg font-bold"
        >
          +
        </button>
      </div>
    </div>
  );
}

// ── 수정 모달 ──

function EditApplicantModal({
  isOpen,
  applicant,
  onClose,
  onSave,
  onDelete,
}: {
  isOpen: boolean;
  applicant: Applicant | null;
  onClose: () => void;
  onSave: (updated: Applicant) => void;
  onDelete: () => void;
}) {
  const [editData, setEditData] = useState<Applicant | null>(null);

  useEffect(() => {
    if (applicant) setEditData({ ...applicant });
  }, [applicant]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !editData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-background rounded-xl shadow-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-background z-10">
          <h3 className="text-lg font-bold">신청 정보 수정</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground text-2xl"
          >
            &times;
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Design Preview */}
          <div className="flex gap-3 items-center p-3 bg-muted/50 rounded-lg">
            <img
              src={getCardImagePath(
                editData.design,
                editData.cardType as CardType
              )}
              alt="Design"
              className="w-16 h-11 object-cover rounded-sm border"
            />
            <div>
              <p className="font-bold text-sm">{editData.designLabel}</p>
              <p className="text-xs text-muted-foreground">
                {editData.cardType}
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-bold block mb-2">이름</label>
            <Input
              value={editData.name}
              onChange={(e) =>
                setEditData({ ...editData, name: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-bold block mb-2">직급</label>
              <select
                value={editData.grade}
                onChange={(e) =>
                  setEditData({ ...editData, grade: e.target.value })
                }
                className="w-full h-9 px-3 border rounded-md bg-background text-sm"
              >
                {GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-bold block mb-2">지사</label>
              <select
                value={editData.branch}
                onChange={(e) =>
                  setEditData({ ...editData, branch: e.target.value })
                }
                className="w-full h-9 px-3 border rounded-md bg-background text-sm"
              >
                {BRANCH_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-bold block mb-2">연락처</label>
            <Input
              value={editData.phone}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  phone: formatPhone(e.target.value),
                })
              }
            />
          </div>

          <div>
            <label className="text-sm font-bold block mb-2">수량</label>
            <Input
              type="number"
              min={1}
              value={editData.qty}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  qty: Math.max(1, Number(e.target.value) || 1),
                })
              }
              className="w-24 text-center"
            />
          </div>

          <div>
            <label className="text-sm font-bold block mb-2">요청사항</label>
            <textarea
              value={editData.request}
              onChange={(e) =>
                setEditData({ ...editData, request: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-md bg-background text-sm min-h-[60px] resize-none"
            />
          </div>
        </div>

        <div className="p-4 border-t flex gap-3 sticky bottom-0 bg-background">
          <button
            onClick={onDelete}
            className="px-4 py-2.5 text-red-600 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            삭제
          </button>
          <button
            onClick={() => onSave(editData)}
            className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-colors"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ──

export default function CardOrderPage() {
  const createOrder = useCreateCardOrder();
  const { employee } = useAuthStore();
  const { data: organizations = [] } = useOrganizations();

  const [step, setStep] = useState<Step>("order");
  const [design, setDesign] = useState<number | null>(null);
  const [cardType, setCardType] = useState<CardType>("로고형");

  // Form
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [branch, setBranch] = useState("");
  const [phone, setPhone] = useState("");
  const [fax, setFax] = useState("");
  const [email, setEmail] = useState("");
  const [addrBase, setAddrBase] = useState("");
  const [addrDetail, setAddrDetail] = useState("");
  const [request, setRequest] = useState("");
  const [qty, setQty] = useState("1");

  const [errors, setErrors] = useState<string[]>([]);
  const [showValidationMsg, setShowValidationMsg] = useState(false);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Shipping
  const [receiver, setReceiver] = useState("");
  const [sPhone, setSPhone] = useState("");
  const [sAddrBase, setSAddrBase] = useState("");
  const [sAddrDetail, setSAddrDetail] = useState("");
  const [sEmail, setSEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Success
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);

  // Carousel
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);

  // 사원 정보 자동 입력
  const employeeOrg = employee?.organizationId
    ? organizations.find((o) => o.id === employee.organizationId)?.name || ""
    : "";

  useEffect(() => {
    if (employee) {
      setName(employee.fullName || "");
      const posName = employee.positionName || "";
      setGrade(GRADE_OPTIONS.includes(posName) ? posName : "");
      setBranch(BRANCH_OPTIONS.includes(employeeOrg) ? employeeOrg : "");
    }
  }, [employee, employeeOrg]);

  // 이미지 프리로드
  useEffect(() => {
    DESIGN_LABELS.forEach((_, i) => {
      [1, 2].forEach((suffix) => {
        const img = new Image();
        img.src = `/card-designs/${i + 1}-${suffix}.png`;
      });
    });
  }, []);

  // 캐러셀 드래그
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
      left:
        scrollRef.current.scrollLeft +
        (dir === "left" ? -amount : amount),
      behavior: "smooth",
    });
  };

  // 가격 계산
  const currentQty = qty ? Number(qty) : 0;
  const savedQty = applicants.reduce((sum, a) => sum + a.qty, 0);
  const totalQty = savedQty + currentQty;
  const deliveryFee = totalQty === 1 ? 3000 : 0;
  const productPrice = totalQty * PRICE_PER_SET;
  const totalPrice = productPrice + deliveryFee;

  // 주문내역 담기
  const handleAddApplicant = () => {
    const newErrors: string[] = [];
    if (!design) newErrors.push("design");
    if (
      !name.trim() ||
      !/^[가-힣ㄱ-ㅎㅏ-ㅣ\u1100-\u11FF\u318D\u318E\s]+$/.test(name)
    )
      newErrors.push("name");
    if (!grade) newErrors.push("grade");
    if (!branch) newErrors.push("branch");
    if (phone.replace(/[^0-9]/g, "").length < 10) newErrors.push("phone");
    if (!qty || Number(qty) < 1) newErrors.push("qty");

    if (newErrors.length > 0) {
      setErrors(newErrors);
      setShowValidationMsg(true);
      return;
    }

    setErrors([]);
    setShowValidationMsg(false);

    const normalizedPhone = phone.replace(/[^0-9]/g, "");
    const formattedPhone = normalizedPhone.startsWith("010")
      ? normalizedPhone
      : "010" + normalizedPhone;

    const newApplicant: Applicant = {
      design: design!,
      designLabel: DESIGN_LABELS[design! - 1],
      cardType,
      name: name.trim(),
      grade,
      branch,
      phone: formattedPhone,
      email: email.trim(),
      request: request.trim(),
      qty: Number(qty),
      fax: fax.trim() || undefined,
      addrBase: addrBase || undefined,
      addrDetail: addrDetail || undefined,
    };

    setApplicants((prev) => [...prev, newApplicant]);
    setName("");
    setGrade("");
    setBranch("");
    setPhone("");
    setFax("");
    setEmail("");
    setRequest("");
    setQty("");
  };

  // 수정/삭제
  const handleEditApplicant = (index: number) => {
    setEditingIndex(index);
    setEditModalOpen(true);
  };

  const handleUpdateApplicant = (updated: Applicant) => {
    if (editingIndex !== null) {
      setApplicants((prev) =>
        prev.map((a, i) => (i === editingIndex ? updated : a))
      );
      setEditModalOpen(false);
      setEditingIndex(null);
    }
  };

  const handleDeleteApplicant = () => {
    if (editingIndex !== null) {
      setApplicants((prev) => prev.filter((_, i) => i !== editingIndex));
      setEditModalOpen(false);
      setEditingIndex(null);
    }
  };

  // 다음 단계
  const handleGoShipping = () => {
    let allApplicants = [...applicants];
    const hasCurrentInput =
      name || grade || branch || phone || email || request || qty;

    if (hasCurrentInput) {
      const newErrors: string[] = [];
      if (!design) newErrors.push("design");
      if (
        !name.trim() ||
        (name &&
          !/^[가-힣ㄱ-ㅎㅏ-ㅣ\u1100-\u11FF\u318D\u318E\s]+$/.test(name))
      )
        newErrors.push("name");
      if (!grade) newErrors.push("grade");
      if (!branch) newErrors.push("branch");
      if (phone.replace(/[^0-9]/g, "").length < 10) newErrors.push("phone");
      if (email && !email.includes("@")) newErrors.push("email");
      if (!qty || Number(qty) < 1) newErrors.push("qty");

      if (newErrors.length > 0) {
        setErrors(newErrors);
        setShowValidationMsg(true);
        return;
      }

      setErrors([]);
      setShowValidationMsg(false);

      const normalizedPhone = phone.replace(/[^0-9]/g, "");
      const formattedPhone = normalizedPhone.startsWith("010")
        ? normalizedPhone
        : "010" + normalizedPhone;

      allApplicants.push({
        design: design!,
        designLabel: DESIGN_LABELS[design! - 1],
        cardType,
        name: name.trim(),
        grade,
        branch,
        phone: formattedPhone,
        email: email.trim(),
        request: request.trim(),
        qty: Number(qty),
        fax: fax.trim() || undefined,
        addrBase: addrBase || undefined,
        addrDetail: addrDetail || undefined,
      });

      setApplicants(allApplicants);
      setName("");
      setGrade("");
      setBranch("");
      setPhone("");
      setFax("");
      setEmail("");
      setRequest("");
      setQty("");
    }

    if (allApplicants.length === 0) {
      setShowValidationMsg(true);
      return;
    }

    setStep("shipping");
    window.scrollTo({ top: 0 });
  };

  // 배송지 - 신청자 정보로 채우기
  const handleUsePrevious = (index: number) => {
    const a = applicants[index];
    setReceiver(a.name);
    setSPhone(
      a.phone.includes("-")
        ? a.phone
        : a.phone.replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-$2-$3")
    );
    setSEmail(a.email || "");
    setSAddrBase(a.addrBase || "");
    setSAddrDetail(a.addrDetail || "");
  };

  // 최종 제출
  const handleSubmit = async () => {
    if (isSending) return;
    setIsSending(true);

    if (!receiver.trim()) {
      alert("받는 분 이름을 입력해주세요.");
      setIsSending(false);
      return;
    }
    if (!sPhone || sPhone.replace(/[^0-9]/g, "").length < 10) {
      alert("연락처를 입력해주세요.");
      setIsSending(false);
      return;
    }
    if (!sAddrBase.trim()) {
      alert("주소를 입력해주세요.");
      setIsSending(false);
      return;
    }
    if (!sEmail.trim() || !sEmail.includes("@")) {
      alert("올바른 이메일 형식을 입력해주세요.");
      setIsSending(false);
      return;
    }

    const normalizedPhone = sPhone.replace(/[^0-9]/g, "");
    const formattedPhone = normalizedPhone.startsWith("010")
      ? normalizedPhone
      : "010" + normalizedPhone;
    const address = `${sAddrBase} ${sAddrDetail}`.trim();

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
        name: receiver,
        phone: formattedPhone.replace(
          /(\d{3})(\d{3,4})(\d{4})/,
          "$1-$2-$3"
        ),
        address,
        email: sEmail.trim(),
      },
    };

    try {
      const result = await createOrder.mutateAsync(input);
      setOrderResult({
        id: result.id,
        totalQty: result.totalQty,
        deliveryFee: result.deliveryFee ?? 0,
        totalAmount: result.totalAmount,
        recipientName: receiver,
        recipientPhone: formattedPhone.replace(
          /(\d{3})(\d{3,4})(\d{4})/,
          "$1-$2-$3"
        ),
        recipientAddress: address,
      });
      setStep("success");
      window.scrollTo({ top: 0 });
    } catch {
      alert("주문 처리 중 오류가 발생했습니다. 다시 시도해주세요.");
      setIsSending(false);
    }
  };

  // 새 주문
  const handleRestart = () => {
    setOrderResult(null);
    setApplicants([]);
    setStep("order");
    setDesign(null);
    setCardType("로고형");
    setReceiver("");
    setSPhone("");
    setSAddrBase("");
    setSAddrDetail("");
    setSEmail("");
    setIsSending(false);
  };

  // ═══════════════════════════════════════════
  // SUCCESS STEP
  // ═══════════════════════════════════════════
  if (step === "success" && orderResult) {
    return (
      <div className="max-w-2xl mx-auto py-8 space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full">
            <Check className="w-12 h-12 text-green-600" strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-bold">
            주문이 정상적으로 접수되었습니다!
          </h2>
          <div className="text-muted-foreground space-y-1">
            <p>
              <strong className="text-foreground">
                {orderResult.recipientName}
              </strong>
              님, 감사합니다.
            </p>
            <p>
              입금 확인 후 영업일 기준{" "}
              <strong className="text-foreground">5~7일</strong> 이내에 배송
              완료됩니다.
            </p>
          </div>
        </div>

        {/* 입금 안내 */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-xl p-8 text-center shadow-xl">
          <div className="flex items-center justify-center gap-2 mb-4">
            <CreditCard className="w-6 h-6 text-yellow-400" />
            <h3 className="text-lg font-bold text-gray-300">
              입금 계좌 안내
            </h3>
          </div>
          <div className="text-2xl font-bold mb-2 tracking-wide">
            카카오뱅크 3333-322-537940
          </div>
          <div className="text-lg font-bold text-gray-300">
            예금주: 송낙주(영업지원팀)
          </div>
        </div>

        {/* 배송 정보 */}
        <div className="border rounded-lg p-5 space-y-4">
          <h3 className="font-bold flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-600" /> 배송 정보
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <span className="text-muted-foreground w-16 shrink-0">
                받는 분
              </span>
              <span className="font-medium">
                {orderResult.recipientName}
              </span>
            </div>
            <div className="flex gap-3">
              <span className="text-muted-foreground w-16 shrink-0">
                연락처
              </span>
              <span className="font-medium">
                {orderResult.recipientPhone}
              </span>
            </div>
            <div className="flex gap-3">
              <span className="text-muted-foreground w-16 shrink-0">
                주소
              </span>
              <span className="font-medium">
                {orderResult.recipientAddress}
              </span>
            </div>
          </div>
        </div>

        {/* 신청 내역 */}
        <div className="border rounded-lg p-5 space-y-4">
          <h3 className="font-bold flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-600" /> 신청 내역
          </h3>
          <div className="space-y-2">
            {applicants.map((a, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-7 h-7 bg-primary text-primary-foreground rounded-full text-xs font-bold">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-bold text-sm">
                      {a.name} ({a.grade})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.designLabel}, {a.cardType}
                    </p>
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
                {(
                  orderResult.totalAmount - orderResult.deliveryFee
                ).toLocaleString()}
                원
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">배송비</span>
              <span className="font-medium">
                {orderResult.deliveryFee.toLocaleString()}원
              </span>
            </div>
            <div className="flex justify-between text-lg pt-2 border-t">
              <span className="font-bold">총 결제 금액</span>
              <span className="font-bold">
                {orderResult.totalAmount.toLocaleString()}원
              </span>
            </div>
          </div>
        </div>

        <Button onClick={handleRestart} className="w-full" size="lg">
          새 주문하기
        </Button>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // SHIPPING STEP
  // ═══════════════════════════════════════════
  if (step === "shipping") {
    const shippingTotalQty = applicants.reduce((sum, a) => sum + a.qty, 0);
    const shippingDeliveryFee = shippingTotalQty === 1 ? 3000 : 0;
    const shippingProductPrice = shippingTotalQty * PRICE_PER_SET;
    const shippingTotalPrice = shippingProductPrice + shippingDeliveryFee;

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 주문 요약 */}
        <div className="border rounded-lg p-5 space-y-4">
          <h3 className="font-bold flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" /> 주문 내용 확인
          </h3>
          <div className="space-y-2">
            {applicants.map((a, idx) => (
              <div
                key={idx}
                onClick={() => handleEditApplicant(idx)}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs font-bold">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-bold text-sm">
                      {a.name} ({a.designLabel})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.grade} / {a.branch}
                    </p>
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
            <span className="text-xl font-bold">
              {shippingTotalPrice.toLocaleString()}원
            </span>
          </div>
        </div>

        {/* 배송지 폼 */}
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
                    handleUsePrevious(idx);
                    e.target.value = "";
                  }
                }}
                defaultValue=""
                className="px-3 py-1.5 text-sm font-medium border rounded-lg bg-primary text-primary-foreground cursor-pointer"
              >
                <option value="" disabled>
                  신청자 정보로 채우기
                </option>
                {applicants.map((a, idx) => (
                  <option
                    key={idx}
                    value={idx}
                    className="bg-background text-foreground"
                  >
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
            <Input
              value={receiver}
              onChange={(e) => setReceiver(e.target.value)}
              placeholder="성함을 입력하세요"
            />
          </div>

          <PhoneInput label="연락처 *" value={sPhone} setValue={setSPhone} />

          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-2">
              <MapPin className="h-4 w-4" /> 배송 주소 *
            </label>
            <AddressInput
              value={sAddrBase}
              onChange={setSAddrBase}
              placeholder="주소 검색"
            />
            <Input
              value={sAddrDetail}
              onChange={(e) => setSAddrDetail(e.target.value)}
              placeholder="상세주소를 입력하세요"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold flex items-center gap-2">
              <Mail className="h-4 w-4" /> 주문 확인용 이메일 *
            </label>
            <Input
              type="email"
              value={sEmail}
              onChange={(e) => setSEmail(e.target.value)}
              placeholder="example@gmail.com"
            />
            <p className="text-xs text-muted-foreground">
              * 위 메일 주소로 주문 확인 메일이 자동 발신됩니다.
            </p>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setStep("order")}>
            <ChevronLeft className="h-4 w-4 mr-1" /> 이전
          </Button>
          <Button onClick={handleSubmit} disabled={isSending} size="lg">
            {isSending && (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            )}
            {isSending ? "주문 처리 중..." : "최종 주문 및 결제 확인"}
          </Button>
        </div>

        {/* 수정 모달 (배송 단계에서도 사용) */}
        <EditApplicantModal
          isOpen={editModalOpen}
          applicant={
            editingIndex !== null ? applicants[editingIndex] : null
          }
          onClose={() => {
            setEditModalOpen(false);
            setEditingIndex(null);
          }}
          onSave={handleUpdateApplicant}
          onDelete={handleDeleteApplicant}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // ORDER STEP (default)
  // ═══════════════════════════════════════════
  return (
    <div>
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        {/* 왼쪽: 프리뷰 + 디자인 선택 */}
        <div className="space-y-6">
          {/* 3D 프리뷰 */}
          {design ? (
            <CardContainer containerClassName="py-0">
              <CardBody>
                <CardItem translateZ={50}>
                  <img
                    key={`${design}-${cardType}`}
                    src={getCardImagePath(design, cardType)}
                    alt={`Design ${design}`}
                    className="max-h-[400px] object-contain rounded-sm"
                    style={{
                      filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.2))",
                    }}
                  />
                </CardItem>
              </CardBody>
            </CardContainer>
          ) : (
            <div
              className={cn(
                "p-6 w-fit mx-auto flex items-center justify-center border rounded-lg transition-all",
                errors.includes("design")
                  ? "border-red-500 shadow-red-100 shadow-lg"
                  : "border-border"
              )}
            >
              <div className="text-center py-8">
                <CreditCard
                  className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4"
                  strokeWidth={1.5}
                />
                <p className="text-muted-foreground font-medium">
                  시안을 선택하면 이곳에 미리보기가 표시됩니다.
                </p>
              </div>
            </div>
          )}

          {/* 시안 캐러셀 */}
          <div>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 bg-primary text-primary-foreground rounded-full text-sm">
                1
              </span>
              시안 선택 *
            </h3>
            <div className="relative group">
              <button
                onClick={() => scrollCarousel("left")}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/70 text-white rounded-full hidden lg:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
              >
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
                        active
                          ? "border-primary shadow-lg scale-105"
                          : "border-border hover:border-primary/50 hover:shadow-md"
                      )}
                    >
                      <img
                        src={`/card-designs/${id}-1.png`}
                        alt={label}
                        className="w-full h-full object-cover"
                      />
                      {active && (
                        <div className="absolute top-2 right-2 bg-primary w-6 h-6 rounded-full flex items-center justify-center">
                          <Check
                            className="w-4 h-4 text-primary-foreground"
                            strokeWidth={3}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => scrollCarousel("right")}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/70 text-white rounded-full hidden lg:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
            {design && (
              <p className="text-sm font-bold mt-3 bg-muted inline-block px-3 py-2 rounded-lg">
                ✓{" "}
                <span className="text-blue-600 dark:text-blue-400">
                  {DESIGN_LABELS[design - 1]}
                </span>
              </p>
            )}
          </div>

          {/* 타입 선택 */}
          <div>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 bg-primary text-primary-foreground rounded-full text-sm">
                2
              </span>
              타입 선택 *
            </h3>
            <div className="inline-flex border rounded-full overflow-hidden">
              {(["로고형", "전화번호형"] as CardType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setCardType(t)}
                  className={cn(
                    "px-6 py-3 font-bold text-sm transition-all",
                    cardType === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            {design && cardType && (
              <p className="text-sm font-bold mt-3 bg-muted inline-block px-3 py-2 rounded-lg">
                ✓{" "}
                <span className="text-blue-600 dark:text-blue-400">
                  {DESIGN_LABELS[design - 1]}, {cardType}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* 오른쪽: 신청자 폼 */}
        <div className="space-y-6">
          <div className="border rounded-lg p-4 sm:p-6">
            <h2 className="text-xl font-bold mb-6">신청자 정보 입력</h2>

            <div className="space-y-5">
              <NameInput
                value={name}
                setValue={setName}
                isInvalid={errors.includes("name")}
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold flex items-center gap-2 mb-1.5">
                    <Award className="h-4 w-4" /> 직급 *
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className={cn(
                      "w-full h-9 px-3 border rounded-md bg-background text-sm",
                      errors.includes("grade") && "border-red-500"
                    )}
                  >
                    <option value="">선택</option>
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold flex items-center gap-2 mb-1.5">
                    <Building2 className="h-4 w-4" /> 지사 *
                  </label>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className={cn(
                      "w-full h-9 px-3 border rounded-md bg-background text-sm",
                      errors.includes("branch") && "border-red-500"
                    )}
                  >
                    <option value="">선택</option>
                    {BRANCH_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PhoneInput
                  label="연락처 *"
                  value={phone}
                  setValue={setPhone}
                  isInvalid={errors.includes("phone")}
                />
                <FaxInput
                  label="팩스 번호 (선택)"
                  value={fax}
                  setValue={setFax}
                />
              </div>

              <EmailInput
                value={email}
                setValue={setEmail}
                isInvalid={errors.includes("email")}
              />

              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> 사무실 주소 (선택)
                </label>
                <AddressInput
                  value={addrBase}
                  onChange={setAddrBase}
                  placeholder="주소 검색"
                />
                <Input
                  value={addrDetail}
                  onChange={(e) => setAddrDetail(e.target.value)}
                  placeholder="상세주소 입력 (선택)"
                />
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

              <QuantityInput
                qty={qty}
                setQty={setQty}
                isInvalid={errors.includes("qty")}
              />

              {showValidationMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm font-medium text-red-600 dark:text-red-400">
                  ⚠️ 필수 입력 사항을 모두 입력해 주세요. (시안 및 타입
                  포함)
                </div>
              )}

              <Button
                onClick={handleAddApplicant}
                className="w-full"
                size="lg"
              >
                + 주문내역 담기
              </Button>
            </div>

            {/* 추가된 신청 내역 */}
            {applicants.length > 0 && (
              <div className="mt-6 p-4 bg-muted/50 border rounded-lg">
                <h4 className="font-bold mb-4 pb-3 border-b flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" /> 추가된
                  신청 내역 ({applicants.length})
                </h4>
                <div className="space-y-2">
                  {applicants.map((a, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleEditApplicant(idx)}
                      className="flex items-center gap-4 p-3 bg-background rounded-lg border hover:shadow-md hover:border-primary/50 transition-all cursor-pointer"
                    >
                      <img
                        src={getCardImagePath(
                          a.design,
                          a.cardType as CardType
                        )}
                        alt={`Design ${a.design}`}
                        className="w-20 h-14 object-cover rounded-sm border"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">
                          {idx + 1}. {a.name} {a.grade}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {a.designLabel}, {a.cardType} / {a.qty}세트
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        수정
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 가격 요약 */}
            {totalQty > 0 && (
              <div className="mt-6 p-4 sm:p-6 bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-xl shadow-xl">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">총 수량</span>
                    <span className="font-bold">{totalQty}세트</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">상품 금액</span>
                    <span className="font-bold">
                      {productPrice.toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex justify-between pb-3 border-b border-gray-700">
                    <span className="text-gray-300">배송비</span>
                    <span className="font-bold">
                      {deliveryFee.toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-lg pt-2">
                    <span className="font-bold">총 결제 예상 금액</span>
                    <span className="text-2xl font-bold text-yellow-400">
                      {totalPrice.toLocaleString()}원
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 다음 단계 버튼 */}
          <div className="sticky bottom-0 z-10">
            <Button
              onClick={handleGoShipping}
              className="w-full shadow-xl"
              size="lg"
            >
              다음 단계 →
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              * 다음 단계에서 최종 주문 내용 확인 및 배송지 입력을 하실 수
              있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 수정 모달 */}
      <EditApplicantModal
        isOpen={editModalOpen}
        applicant={
          editingIndex !== null ? applicants[editingIndex] : null
        }
        onClose={() => {
          setEditModalOpen(false);
          setEditingIndex(null);
        }}
        onSave={handleUpdateApplicant}
        onDelete={handleDeleteApplicant}
      />
    </div>
  );
}
