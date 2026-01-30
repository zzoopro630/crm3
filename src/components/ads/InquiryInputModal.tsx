import { useState, useEffect } from "react";
import { Save, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateInquiries } from "@/hooks/useAds";

interface InquiryInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  keywords: string[];
  defaultDate: string;
}

interface InquiryInput {
  keyword: string;
  count: number;
}

export function InquiryInputModal({
  isOpen,
  onClose,
  onSave,
  keywords,
  defaultDate,
}: InquiryInputModalProps) {
  const [date, setDate] = useState(defaultDate);
  const [inputs, setInputs] = useState<InquiryInput[]>([]);
  const [error, setError] = useState<string | null>(null);
  const createInquiries = useCreateInquiries();

  useEffect(() => {
    if (isOpen) {
      setDate(defaultDate);
      setInputs(
        keywords.slice(0, 10).map((kw) => ({ keyword: kw, count: 0 })),
      );
      setError(null);
    }
  }, [isOpen, defaultDate, keywords]);

  const handleCountChange = (index: number, value: string) => {
    const numValue = parseInt(value) || 0;
    setInputs((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, count: Math.max(0, numValue) } : item,
      ),
    );
  };

  const handleKeywordChange = (index: number, value: string) => {
    setInputs((prev) =>
      prev.map((item, i) => (i === index ? { ...item, keyword: value } : item)),
    );
  };

  const addRow = () => {
    setInputs((prev) => [...prev, { keyword: "", count: 0 }]);
  };

  const removeRow = (index: number) => {
    setInputs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const validInputs = inputs.filter(
      (input) => input.count > 0 && input.keyword.trim(),
    );

    if (validInputs.length === 0) {
      setError("저장할 문의 데이터가 없습니다.");
      return;
    }

    setError(null);

    try {
      const records = validInputs.flatMap((input) =>
        Array.from({ length: input.count }, (_, i) => ({
          customer_name: `수동입력_${input.keyword}_${i + 1}`,
          phone: null as null,
          product_name: input.keyword,
          utm_campaign: input.keyword,
          source_url: "manual_input",
          inquiry_date: `${date}T12:00:00+09:00`,
        })),
      );

      await createInquiries.mutateAsync(records);
      alert(`${records.length}건의 문의 데이터가 저장되었습니다.`);
      onSave();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "저장에 실패했습니다.";
      setError(message);
    }
  };

  const totalCount = inputs.reduce((sum, item) => sum + item.count, 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>문의 수동 입력</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          <div className="space-y-2">
            <Label>날짜</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>키워드별 문의 수</Label>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {inputs.map((input, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    placeholder="키워드"
                    value={input.keyword}
                    onChange={(e) => handleKeywordChange(index, e.target.value)}
                    className="flex-2"
                    list="keyword-suggestions"
                  />
                  <Input
                    type="number"
                    min="0"
                    value={input.count || ""}
                    onChange={(e) => handleCountChange(index, e.target.value)}
                    placeholder="0"
                    className="w-20 text-center"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(index)}
                    className="text-destructive shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <datalist id="keyword-suggestions">
              {keywords.map((kw) => (
                <option key={kw} value={kw} />
              ))}
            </datalist>
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus className="h-4 w-4 mr-1" />
              행 추가
            </Button>
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm font-medium">
            총 문의 수: {totalCount}건
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 text-destructive p-3 text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            onClick={handleSave}
            disabled={createInquiries.isPending || totalCount === 0}
          >
            <Save className="h-4 w-4 mr-1" />
            {createInquiries.isPending ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
