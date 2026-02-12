import { useState } from "react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AFFILIATIONS, POSITIONS } from "./constants";
import type { CartItem, ApplicantInfo } from "./types";

interface ApplicantFormStepProps {
  cart: CartItem[];
  defaultInfo: ApplicantInfo;
  onQuantityChange: (cartKey: string, quantity: number) => void;
  onRemoveItem: (cartKey: string) => void;
  onBack: () => void;
  onSubmit: (info: ApplicantInfo) => Promise<void>;
  isSubmitting: boolean;
}

const AnimatedFormField = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 20, height: 0 }}
    animate={{ opacity: 1, y: 0, height: "auto" }}
    exit={{ opacity: 0, y: -20, height: 0 }}
    transition={{ duration: 0.3, ease: "easeInOut" }}
  >
    {children}
  </motion.div>
);

function validateField(name: string, value: string): string {
  if (name === "name") {
    if (/[a-zA-Z]/.test(value)) return "이름에는 영문을 사용할 수 없습니다.";
    if (!value) return "이름을 입력해주세요.";
  } else if (name === "affiliation") {
    if (!value) return "소속을 선택해주세요.";
  } else if (name === "position") {
    if (!value) return "직급을 선택해주세요.";
  } else if (name === "phone") {
    if (!/^010-\d{4}-\d{4}$/.test(value))
      return "전화번호 8자리를 모두 입력해주세요.";
  } else if (name === "email") {
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value))
      return "유효한 이메일 주소를 입력해주세요.";
  }
  return "";
}

export default function ApplicantFormStep({
  cart,
  defaultInfo,
  onQuantityChange,
  onRemoveItem,
  onBack,
  onSubmit,
  isSubmitting,
}: ApplicantFormStepProps) {
  const [applicant, setApplicant] = useState<ApplicantInfo>({
    name: defaultInfo.name || "",
    affiliation: defaultInfo.affiliation || "",
    position: defaultInfo.position || "",
    phone: defaultInfo.phone || "010-",
    email: defaultInfo.email || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const totalAmount = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === "phone") {
      if (!value.startsWith("010-")) return;
      let userInput = value.substring(4).replace(/[^\d]/g, "");
      userInput = userInput.substring(0, 8);
      let formatted = "010-";
      if (userInput.length > 0) formatted += userInput.substring(0, 4);
      if (userInput.length > 4) formatted += "-" + userInput.substring(4);
      finalValue = formatted;
    } else if (name === "email") {
      finalValue = value.replace(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g, "");
    } else if (name === "name") {
      finalValue = value.replace(/[a-zA-Z]/g, "");
    }

    setApplicant((prev) => ({ ...prev, [name]: finalValue }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, finalValue) }));
  };

  const handleSelectChange = (field: "affiliation" | "position", value: string) => {
    setApplicant((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConfirmOpen(true);
  };

  const handleConfirmSubmit = () => {
    setIsConfirmOpen(false);
    onSubmit(applicant);
  };

  const isNameValid = !!applicant.name && !validateField("name", applicant.name);
  const isAffiliationValid =
    !!applicant.affiliation && !validateField("affiliation", applicant.affiliation);
  const isPositionValid =
    !!applicant.position && !validateField("position", applicant.position);
  const isPhoneValid =
    !!applicant.phone && !validateField("phone", applicant.phone);
  const isEmailValid =
    !!applicant.email && !validateField("email", applicant.email);
  const allValid =
    isNameValid && isAffiliationValid && isPositionValid && isPhoneValid && isEmailValid;

  return (
    <>
      <div className="max-w-2xl mx-auto">
        <div className="bg-background p-6 rounded-lg border">
          {/* 주문 내역 */}
          <div className="w-full mb-6">
            <h2 className="text-xl font-semibold mb-4">주문 내역</h2>
            <div className="p-4 border rounded-md space-y-2">
              {cart.map((item, index) => (
                <div
                  key={item.cartKey}
                  className="p-3 bg-muted/50 rounded-md space-y-2"
                >
                  <div className="font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis">
                    {index + 1}. {item.product.name} ({item.region})
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-r-none"
                        onClick={() =>
                          onQuantityChange(
                            item.cartKey,
                            Math.max(1, item.quantity - 1)
                          )
                        }
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          onQuantityChange(
                            item.cartKey,
                            Math.max(1, parseInt(e.target.value, 10) || 1)
                          )
                        }
                        className="w-16 h-8 text-center rounded-none border-l-0 border-r-0 [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        min="1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-l-none"
                        onClick={() =>
                          onQuantityChange(item.cartKey, item.quantity + 1)
                        }
                      >
                        +
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-muted-foreground">
                          단가: {item.product.price.toLocaleString()}원
                        </span>
                        <span className="font-bold text-primary text-base">
                          {(item.product.price * item.quantity).toLocaleString()}원
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveItem(item.cartKey)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              <div className="text-xl font-bold text-right pt-2 border-t">
                총 합계: {totalAmount.toLocaleString()}원
              </div>
            </div>
          </div>

          {/* 신청자 정보 */}
          <form
            onSubmit={handleFormSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
          >
            <h2 className="text-xl font-semibold mb-4">신청자 정보</h2>
            <div className="space-y-4">
              <AnimatedFormField>
                <div>
                  <Label htmlFor="name">이름</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="한글로 입력하세요"
                    value={applicant.name}
                    onChange={handleInputChange}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive mt-1">{errors.name}</p>
                  )}
                </div>
              </AnimatedFormField>

              <AnimatePresence>
                {isNameValid && (
                  <AnimatedFormField>
                    <div>
                      <Label htmlFor="affiliation">소속</Label>
                      <Select
                        value={applicant.affiliation}
                        onValueChange={(v) => handleSelectChange("affiliation", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="소속을 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {AFFILIATIONS.map((aff) => (
                            <SelectItem key={aff} value={aff}>
                              {aff}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.affiliation && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.affiliation}
                        </p>
                      )}
                    </div>
                  </AnimatedFormField>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {isNameValid && isAffiliationValid && (
                  <AnimatedFormField>
                    <div>
                      <Label htmlFor="position">직급</Label>
                      <Select
                        value={applicant.position}
                        onValueChange={(v) => handleSelectChange("position", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="직급을 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {POSITIONS.map((pos) => (
                            <SelectItem key={pos} value={pos}>
                              {pos}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.position && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.position}
                        </p>
                      )}
                    </div>
                  </AnimatedFormField>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {isNameValid && isAffiliationValid && isPositionValid && (
                  <AnimatedFormField>
                    <div>
                      <Label htmlFor="phone">연락처</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        inputMode="numeric"
                        placeholder="010-0000-0000"
                        value={applicant.phone}
                        onChange={handleInputChange}
                      />
                      {errors.phone && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.phone}
                        </p>
                      )}
                    </div>
                  </AnimatedFormField>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {isNameValid &&
                  isAffiliationValid &&
                  isPositionValid &&
                  isPhoneValid && (
                    <AnimatedFormField>
                      <div>
                        <Label htmlFor="email">이메일</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="이메일 주소를 입력하세요"
                          value={applicant.email}
                          onChange={handleInputChange}
                        />
                        {errors.email && (
                          <p className="text-sm text-destructive mt-1">
                            {errors.email}
                          </p>
                        )}
                      </div>
                    </AnimatedFormField>
                  )}
              </AnimatePresence>
            </div>

            <div className="mt-8 flex justify-between">
              <Button type="button" variant="outline" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                이전
              </Button>
              <AnimatePresence>
                {allValid && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Button
                      type="submit"
                      disabled={isSubmitting || totalAmount === 0}
                    >
                      {isSubmitting && (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      )}
                      {isSubmitting ? "신청 접수 중..." : "신청하기"}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </form>
        </div>
      </div>

      {/* 확인 다이얼로그 */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>신청 내역을 확인해주세요</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="p-4 border rounded-md space-y-2 max-h-60 overflow-y-auto mt-4">
                {cart.map((item, index) => (
                  <div
                    key={item.cartKey}
                    className="flex justify-between items-center p-2 bg-muted/50 rounded-md"
                  >
                    <span>
                      {index + 1}. {item.product.name} ({item.region}) x
                      {item.quantity}
                    </span>
                    <span>
                      {(item.product.price * item.quantity).toLocaleString()}원
                    </span>
                  </div>
                ))}
                <div className="text-lg font-bold text-right pt-2 border-t">
                  총 합계: {totalAmount.toLocaleString()}원
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit}>
              최종 신청
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
