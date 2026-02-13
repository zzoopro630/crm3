import { useState, useEffect } from "react";
import { useCreateCardOrder } from "@/hooks/useCardOrders";
import { useAuthStore } from "@/stores/authStore";
import { useOrganizations } from "@/hooks/useOrganizations";
import type { CreateCardOrderInput } from "@/types/cardOrder";
import {
  DESIGN_LABELS,
  GRADE_OPTIONS,
  BRANCH_OPTIONS,
} from "@/components/orders/card/constants";
import type { Step, CardType, Applicant, OrderResult } from "@/components/orders/card/constants";
import { OrderStep } from "@/components/orders/card/OrderStep";
import { ShippingStep } from "@/components/orders/card/ShippingStep";
import { SuccessStep } from "@/components/orders/card/SuccessStep";

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

  // Auto-fill employee info
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

  // Preload images
  useEffect(() => {
    DESIGN_LABELS.forEach((_, i) => {
      [1, 2].forEach((suffix) => {
        const img = new Image();
        img.src = `/card-designs/${i + 1}-${suffix}.png`;
      });
    });
  }, []);

  // --- Handlers ---

  const handleAddApplicant = () => {
    const newErrors: string[] = [];
    if (!design) newErrors.push("design");
    if (!name.trim() || !/^[가-힣ㄱ-ㅎㅏ-ㅣ\u1100-\u11FF\u318D\u318E\s]+$/.test(name))
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
    const formattedPhone = normalizedPhone.startsWith("010") ? normalizedPhone : "010" + normalizedPhone;

    setApplicants((prev) => [
      ...prev,
      {
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
      },
    ]);
    resetForm();
  };

  const resetForm = () => {
    setName("");
    setGrade("");
    setBranch("");
    setPhone("");
    setFax("");
    setEmail("");
    setRequest("");
    setQty("");
  };

  const handleEditApplicant = (index: number) => {
    setEditingIndex(index);
    setEditModalOpen(true);
  };

  const handleUpdateApplicant = (updated: Applicant) => {
    if (editingIndex !== null) {
      setApplicants((prev) => prev.map((a, i) => (i === editingIndex ? updated : a)));
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

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingIndex(null);
  };

  const handleGoShipping = () => {
    let allApplicants = [...applicants];
    const hasCurrentInput = name || grade || branch || phone || email || request || qty;

    if (hasCurrentInput) {
      const newErrors: string[] = [];
      if (!design) newErrors.push("design");
      if (!name.trim() || (name && !/^[가-힣ㄱ-ㅎㅏ-ㅣ\u1100-\u11FF\u318D\u318E\s]+$/.test(name)))
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
      const formattedPhone = normalizedPhone.startsWith("010") ? normalizedPhone : "010" + normalizedPhone;

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
      resetForm();
    }

    if (allApplicants.length === 0) {
      setShowValidationMsg(true);
      return;
    }

    setStep("shipping");
    window.scrollTo({ top: 0 });
  };

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

  const handleSubmit = async () => {
    if (isSending) return;
    setIsSending(true);

    if (!receiver.trim()) { alert("받는 분 이름을 입력해주세요."); setIsSending(false); return; }
    if (!sPhone || sPhone.replace(/[^0-9]/g, "").length < 10) { alert("연락처를 입력해주세요."); setIsSending(false); return; }
    if (!sAddrBase.trim()) { alert("주소를 입력해주세요."); setIsSending(false); return; }
    if (!sEmail.trim() || !sEmail.includes("@")) { alert("올바른 이메일 형식을 입력해주세요."); setIsSending(false); return; }

    const normalizedPhone = sPhone.replace(/[^0-9]/g, "");
    const formattedPhone = normalizedPhone.startsWith("010") ? normalizedPhone : "010" + normalizedPhone;
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
        phone: formattedPhone.replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-$2-$3"),
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
        recipientPhone: formattedPhone.replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-$2-$3"),
        recipientAddress: address,
      });
      setStep("success");
      window.scrollTo({ top: 0 });
    } catch {
      alert("주문 처리 중 오류가 발생했습니다. 다시 시도해주세요.");
      setIsSending(false);
    }
  };

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

  // --- Render ---

  if (step === "success" && orderResult) {
    return (
      <SuccessStep
        orderResult={orderResult}
        applicants={applicants}
        onRestart={handleRestart}
      />
    );
  }

  if (step === "shipping") {
    return (
      <ShippingStep
        applicants={applicants}
        receiver={receiver}
        setReceiver={setReceiver}
        sPhone={sPhone}
        setSPhone={setSPhone}
        sAddrBase={sAddrBase}
        setSAddrBase={setSAddrBase}
        sAddrDetail={sAddrDetail}
        setSAddrDetail={setSAddrDetail}
        sEmail={sEmail}
        setSEmail={setSEmail}
        isSending={isSending}
        onBack={() => setStep("order")}
        onSubmit={handleSubmit}
        onUsePrevious={handleUsePrevious}
        editModalOpen={editModalOpen}
        editingIndex={editingIndex}
        onEditApplicant={handleEditApplicant}
        onUpdateApplicant={handleUpdateApplicant}
        onDeleteApplicant={handleDeleteApplicant}
        onCloseEditModal={handleCloseEditModal}
      />
    );
  }

  return (
    <OrderStep
      design={design}
      setDesign={setDesign}
      cardType={cardType}
      setCardType={setCardType}
      name={name}
      setName={setName}
      grade={grade}
      setGrade={setGrade}
      branch={branch}
      setBranch={setBranch}
      phone={phone}
      setPhone={setPhone}
      fax={fax}
      setFax={setFax}
      email={email}
      setEmail={setEmail}
      addrBase={addrBase}
      setAddrBase={setAddrBase}
      addrDetail={addrDetail}
      setAddrDetail={setAddrDetail}
      request={request}
      setRequest={setRequest}
      qty={qty}
      setQty={setQty}
      errors={errors}
      showValidationMsg={showValidationMsg}
      applicants={applicants}
      onAddApplicant={handleAddApplicant}
      onGoShipping={handleGoShipping}
      editModalOpen={editModalOpen}
      editingIndex={editingIndex}
      onEditApplicant={handleEditApplicant}
      onUpdateApplicant={handleUpdateApplicant}
      onDeleteApplicant={handleDeleteApplicant}
      onCloseEditModal={handleCloseEditModal}
    />
  );
}
