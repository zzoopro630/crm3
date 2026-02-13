import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import type { Employee, CreateEmployeeInput } from "@/types/employee";
import { SECURITY_LEVELS } from "@/types/employee";
import type { Organization } from "@/services/organizations";

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingEmployee: Employee | null;
  formData: CreateEmployeeInput;
  setFormData: (data: CreateEmployeeInput) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  isF1: boolean;
  organizations: Organization[] | undefined;
  employees: Employee[] | undefined;
  getOrganizationName: (orgId: number | null | undefined) => string;
}

export function EmployeeFormDialog({
  isOpen,
  onOpenChange,
  editingEmployee,
  formData,
  setFormData,
  onSubmit,
  isPending,
  isF1,
  organizations,
  employees,
  getOrganizationName,
}: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-900 dark:text-white">
            {editingEmployee ? "사원 정보 수정" : "사원 등록"}
          </DialogTitle>
          <DialogDescription>
            {editingEmployee
              ? "사원 정보를 수정합니다"
              : "새로운 사원을 등록합니다"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">
              이메일 *{editingEmployee && !isF1 && " (수정불가)"}
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              disabled={!!editingEmployee && !isF1}
              className="bg-white dark:bg-zinc-800"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">이름 *</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              required
              className="bg-white dark:bg-zinc-800"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="securityLevel">보안등급 *</Label>
            <select
              id="securityLevel"
              value={formData.securityLevel}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  securityLevel: e.target
                    .value as CreateEmployeeInput["securityLevel"],
                })
              }
              className="w-full h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
            >
              {SECURITY_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="organizationId">조직</Label>
            <select
              id="organizationId"
              value={formData.organizationId || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  organizationId: e.target.value
                    ? parseInt(e.target.value)
                    : null,
                })
              }
              className="w-full h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
            >
              <option value="">선택 안함</option>
              {organizations?.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="parentId">상위자</Label>
            <select
              id="parentId"
              value={formData.parentId || ""}
              onChange={(e) =>
                setFormData({ ...formData, parentId: e.target.value || null })
              }
              className="w-full h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
            >
              <option value="">선택 안함</option>
              {employees
                ?.filter(
                  (e) =>
                    e.id !== editingEmployee?.id &&
                    e.isActive &&
                    (!formData.organizationId ||
                      e.organizationId === formData.organizationId)
                )
                .map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.securityLevel})
                  </option>
                ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="positionName">직급</Label>
            <select
              id="positionName"
              value={formData.positionName || ""}
              onChange={(e) => {
                const newPosition = e.target.value;
                if (newPosition === "총괄이사") {
                  const ceo = employees?.find((emp) => emp.positionName === "대표" && emp.isActive);
                  setFormData({
                    ...formData,
                    positionName: newPosition,
                    parentId: ceo?.id || null,
                  });
                } else {
                  setFormData({ ...formData, positionName: newPosition });
                }
              }}
              className="w-full h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
            >
              <option value="">선택 안함</option>
              {getOrganizationName(formData.organizationId) === "영업지원팀"
                ? ["실장", "과장", "대리", "주임", "사원"].map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))
                : [
                    "대표",
                    "총괄이사",
                    "사업단장",
                    "지점장",
                    "팀장",
                    "FC",
                  ].map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
            </select>
          </div>
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isPending}
            >
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingEmployee ? "수정" : "등록"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
