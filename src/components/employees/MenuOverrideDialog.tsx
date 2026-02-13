import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import type { Employee } from "@/types/employee";
import type { MenuRole, EmployeeMenuOverride } from "@/types/menuRole";
import { useEmployeeOverrides, useUpdateEmployeeOverrides } from "@/hooks/useMenuRole";

const OVERRIDE_MENUS = [
  "/", "/notices", "/resources", "/customers", "/customers/trash",
  "/inquiries", "/consultant-inquiries", "/recruit-inquiries",
  "/team", "/contacts-direct",
  "/ads/ndata", "/ads/powerlink", "/ads/report", "/ads/weekly",
  "/ads/rank-dashboard", "/ads/rank-keywords", "/ads/rank-urls", "/ads/rank-history",
  "/settings/organizations", "/settings/labels", "/settings/app-settings",
  "/settings/menu-permissions", "/settings/employees", "/settings/approvals",
];

const MENU_LABELS: Record<string, string> = {
  "/": "대시보드", "/notices": "공지사항", "/resources": "자료실",
  "/customers": "고객리스트", "/customers/trash": "휴지통",
  "/inquiries": "보험문의", "/consultant-inquiries": "더플문의",
  "/recruit-inquiries": "입사문의", "/team": "팀 관리",
  "/contacts-direct": "연락처",
  "/ads/ndata": "N-DATA", "/ads/powerlink": "파워링크",
  "/ads/report": "보고서", "/ads/weekly": "주간데이터",
  "/ads/rank-dashboard": "순위 대시보드", "/ads/rank-keywords": "사이트/키워드",
  "/ads/rank-urls": "URL 추적", "/ads/rank-history": "순위 기록",
  "/settings/organizations": "조직 관리", "/settings/labels": "라벨 관리",
  "/settings/app-settings": "앱 설정", "/settings/menu-permissions": "메뉴 권한",
  "/settings/employees": "사원 관리", "/settings/approvals": "승인 대기",
};

interface Props {
  employee: Employee | null;
  onClose: () => void;
}

export function MenuOverrideDialog({ employee, onClose }: Props) {
  const [localOverrides, setLocalOverrides] = useState<EmployeeMenuOverride[]>([]);
  const { data: fetchedOverrides } = useEmployeeOverrides(employee?.id ?? null);
  const updateOverrides = useUpdateEmployeeOverrides();

  useEffect(() => {
    if (fetchedOverrides && employee) {
      setLocalOverrides(fetchedOverrides);
    }
  }, [fetchedOverrides, employee]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setLocalOverrides([]);
    }
  };

  const getOverrideRole = (menuPath: string): MenuRole | "" => {
    const found = localOverrides.find((o) => o.menuPath === menuPath);
    return found ? found.role : "";
  };

  const setOverrideRole = (menuPath: string, role: MenuRole | "") => {
    setLocalOverrides((prev) => {
      if (role === "") {
        return prev.filter((o) => o.menuPath !== menuPath);
      }
      const existing = prev.find((o) => o.menuPath === menuPath);
      if (existing) {
        return prev.map((o) => (o.menuPath === menuPath ? { ...o, role } : o));
      }
      return [...prev, { menuPath, role }];
    });
  };

  const handleSave = async () => {
    if (!employee) return;
    try {
      await updateOverrides.mutateAsync({
        employeeId: employee.id,
        overrides: localOverrides,
      });
      onClose();
      setLocalOverrides([]);
    } catch { /* global onError toast */ }
  };

  return (
    <Dialog open={!!employee} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-900 dark:text-white">
            메뉴 권한 오버라이드 - {employee?.fullName} ({employee?.securityLevel})
          </DialogTitle>
          <DialogDescription>
            등급 기본값과 다르게 설정할 메뉴만 변경하세요. "기본값"은 등급 설정을 따릅니다.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-1">
          {OVERRIDE_MENUS.map((menuPath) => {
            const currentRole = getOverrideRole(menuPath);
            return (
              <div
                key={menuPath}
                className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/30"
              >
                <span className="text-sm truncate mr-4">
                  {MENU_LABELS[menuPath] || menuPath}
                </span>
                <select
                  value={currentRole}
                  onChange={(e) =>
                    setOverrideRole(menuPath, e.target.value as MenuRole | "")
                  }
                  className="w-28 h-8 text-xs px-2 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                >
                  <option value="">기본값</option>
                  <option value="none">접근불가</option>
                  <option value="viewer">뷰어</option>
                  <option value="editor">편집자</option>
                </select>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            취소
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1"
            disabled={updateOverrides.isPending}
          >
            {updateOverrides.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            저장
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
