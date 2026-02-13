import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import type { Applicant, CardType } from "./constants";
import { GRADE_OPTIONS, BRANCH_OPTIONS, getCardImagePath, formatPhone } from "./constants";

interface Props {
  isOpen: boolean;
  applicant: Applicant | null;
  onClose: () => void;
  onSave: (updated: Applicant) => void;
  onDelete: () => void;
}

export function EditApplicantModal({
  isOpen,
  applicant,
  onClose,
  onSave,
  onDelete,
}: Props) {
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
              src={getCardImagePath(editData.design, editData.cardType as CardType)}
              alt="Design"
              className="w-16 h-11 object-cover rounded-sm border"
            />
            <div>
              <p className="font-bold text-sm">{editData.designLabel}</p>
              <p className="text-xs text-muted-foreground">{editData.cardType}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-bold block mb-2">이름</label>
            <Input
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-bold block mb-2">직급</label>
              <select
                value={editData.grade}
                onChange={(e) => setEditData({ ...editData, grade: e.target.value })}
                className="w-full h-9 px-3 border rounded-md bg-background text-sm"
              >
                {GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-bold block mb-2">지사</label>
              <select
                value={editData.branch}
                onChange={(e) => setEditData({ ...editData, branch: e.target.value })}
                className="w-full h-9 px-3 border rounded-md bg-background text-sm"
              >
                {BRANCH_OPTIONS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-bold block mb-2">연락처</label>
            <Input
              value={editData.phone}
              onChange={(e) =>
                setEditData({ ...editData, phone: formatPhone(e.target.value) })
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
              onChange={(e) => setEditData({ ...editData, request: e.target.value })}
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
