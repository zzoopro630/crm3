import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import type { Employee } from "@/types/employee";
import { SECURITY_LEVELS } from "@/types/employee";
import type { Organization } from "@/services/organizations";

export interface BulkEditData {
  securityLevel: string;
  organizationId: string;
  positionName: string;
  parentId: string;
}

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  selectedIds: string[];
  bulkEditData: BulkEditData;
  setBulkEditData: (data: BulkEditData) => void;
  onSubmit: () => void;
  isPending: boolean;
  organizations: Organization[] | undefined;
  employees: Employee[] | undefined;
  getOrganizationName: (orgId: number | null | undefined) => string;
}

export function BulkEditDialog({
  isOpen,
  onOpenChange,
  selectedCount,
  selectedIds,
  bulkEditData,
  setBulkEditData,
  onSubmit,
  isPending,
  organizations,
  employees,
  getOrganizationName,
}: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-900 dark:text-white">
            일괄 수정 ({selectedCount}명)
          </DialogTitle>
          <DialogDescription>
            선택한 사원들의 정보를 일괄 변경합니다. 변경할 항목만 선택하세요.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bulkSecurityLevel">보안등급</Label>
            <select
              id="bulkSecurityLevel"
              value={bulkEditData.securityLevel}
              onChange={(e) =>
                setBulkEditData({
                  ...bulkEditData,
                  securityLevel: e.target.value,
                })
              }
              className="w-full h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
            >
              <option value="">변경 안함</option>
              {SECURITY_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bulkOrganizationId">조직</Label>
            <select
              id="bulkOrganizationId"
              value={bulkEditData.organizationId}
              onChange={(e) =>
                setBulkEditData({
                  ...bulkEditData,
                  organizationId: e.target.value,
                  parentId: "",
                })
              }
              className="w-full h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
            >
              <option value="">변경 안함</option>
              {organizations?.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bulkPositionName">직급</Label>
            <select
              id="bulkPositionName"
              value={bulkEditData.positionName}
              onChange={(e) =>
                setBulkEditData({
                  ...bulkEditData,
                  positionName: e.target.value,
                })
              }
              className="w-full h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
            >
              <option value="">변경 안함</option>
              {getOrganizationName(
                bulkEditData.organizationId
                  ? parseInt(bulkEditData.organizationId)
                  : null
              ) === "영업지원팀"
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
          <div className="space-y-2">
            <Label htmlFor="bulkParentId">상위자</Label>
            <select
              id="bulkParentId"
              value={bulkEditData.parentId}
              onChange={(e) =>
                setBulkEditData({
                  ...bulkEditData,
                  parentId: e.target.value,
                })
              }
              className="w-full h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
            >
              <option value="">변경 안함</option>
              {employees
                ?.filter(
                  (e) =>
                    e.isActive &&
                    (!bulkEditData.organizationId ||
                      e.organizationId ===
                        parseInt(bulkEditData.organizationId)) &&
                    !selectedIds.includes(e.id)
                )
                .map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.securityLevel})
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
              onClick={onSubmit}
              className="flex-1"
              disabled={
                isPending ||
                (!bulkEditData.securityLevel &&
                  !bulkEditData.organizationId &&
                  !bulkEditData.positionName &&
                  !bulkEditData.parentId)
              }
            >
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              일괄 적용
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
