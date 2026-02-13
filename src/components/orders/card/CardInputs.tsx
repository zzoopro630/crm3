import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { User, Phone, Printer, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPhone, formatFax } from "./constants";

export function NameInput({
  value,
  setValue,
  isInvalid,
}: {
  value: string;
  setValue: (v: string) => void;
  isInvalid?: boolean;
}) {
  const [showError, setShowError] = useState(false);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => { return () => { clearTimeout(errorTimerRef.current); }; }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const onlyKorean = val.replace(
      /[^가-힣ㄱ-ㅎㅏ-ㅣ\u1100-\u11FF\u318D\u318E ]/g,
      ""
    );
    if (val !== onlyKorean) {
      setShowError(true);
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => setShowError(false), 2000);
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

export function PhoneInput({
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

export function FaxInput({
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

export function EmailInput({
  value,
  setValue,
  isInvalid,
}: {
  value: string;
  setValue: (v: string) => void;
  isInvalid?: boolean;
}) {
  const [showError, setShowError] = useState(false);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => { return () => { clearTimeout(errorTimerRef.current); }; }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const noKorean = val.replace(/[가-힣ㄱ-ㅎㅏ-ㅣ]/g, "");
    if (val !== noKorean) {
      setShowError(true);
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => setShowError(false), 2000);
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

export function QuantityInput({
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
