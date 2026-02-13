import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  RotateCcw,
  Trash2,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import type { Employee } from "@/types/employee";

// ── 유틸 함수 ──

const getPositionPriority = (position: string | null): number => {
  const priorities: Record<string, number> = {
    대표: 1, 총괄이사: 2, 사업단장: 3, 지점장: 4, 팀장: 5, FC: 6,
    실장: 10, 과장: 11, 대리: 12, 주임: 13, 사원: 14,
  };
  return priorities[position || ""] || 99;
};

const isDirectOrg = (orgName: string) =>
  ["영업지원팀", "총무팀"].includes(orgName);

const getOrgPriority = (orgName: string): number => {
  if (orgName === "영업지원팀") return 1;
  if (orgName === "총무팀") return 2;
  return 10;
};

const getSecurityLevelBadge = (level: string) => {
  const colors: Record<string, string> = {
    F1: "bg-red-500/10 text-red-500 border-red-500/20",
    F2: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    F3: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    F4: "bg-green-500/10 text-green-500 border-green-500/20",
    F5: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    M1: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    M2: "bg-violet-500/10 text-violet-500 border-violet-500/20",
    M3: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  };
  return colors[level] || colors.F5;
};

export function buildTreeSortedList(empList: Employee[]): Employee[] {
  const result: Employee[] = [];
  const visited = new Set<string>();

  const addWithChildren = (emp: Employee) => {
    if (visited.has(emp.id)) return;
    visited.add(emp.id);
    result.push(emp);
    const children = empList
      .filter((e) => e.parentId === emp.id && !visited.has(e.id))
      .sort((a, b) => getPositionPriority(a.positionName) - getPositionPriority(b.positionName));
    children.forEach((child) => addWithChildren(child));
  };

  const roots = empList
    .filter((emp) => !emp.parentId || !empList.some((e) => e.id === emp.parentId))
    .sort((a, b) => getPositionPriority(a.positionName) - getPositionPriority(b.positionName));
  roots.forEach((root) => addWithChildren(root));

  empList
    .filter((emp) => !visited.has(emp.id))
    .sort((a, b) => getPositionPriority(a.positionName) - getPositionPriority(b.positionName))
    .forEach((emp) => addWithChildren(emp));

  return result;
}

type OrgGroup = {
  orgName: string;
  orgId: number | null;
  members: Employee[];
};

export function groupByOrganization(
  nonCeoList: Employee[],
  getOrganizationName: (orgId: number | null | undefined) => string,
): OrgGroup[] {
  const byOrg = new Map<number | null, Employee[]>();
  nonCeoList.forEach((emp) => {
    const orgId = emp.organizationId || null;
    if (!byOrg.has(orgId)) byOrg.set(orgId, []);
    byOrg.get(orgId)!.push(emp);
  });

  const groups: OrgGroup[] = [];
  Array.from(byOrg.entries()).forEach(([orgId, members]) => {
    groups.push({
      orgName: getOrganizationName(orgId),
      orgId,
      members: buildTreeSortedList(members),
    });
  });

  return groups.sort((a, b) => {
    const priorityA = getOrgPriority(a.orgName);
    const priorityB = getOrgPriority(b.orgName);
    if (priorityA !== priorityB) return priorityA - priorityB;
    return a.orgName.localeCompare(b.orgName);
  });
}

// ── 컴포넌트 ──

interface Props {
  ceoList: Employee[];
  organizationGroups: OrgGroup[];
  selectedIds: string[];
  onSelectAll: (checked: boolean, members: Employee[]) => void;
  onSelectOne: (id: string, checked: boolean) => void;
  onEditEmployee: (employee: Employee) => void;
  onOpenOverride: (employee: Employee) => void;
  isF1: boolean;
  showInactive: boolean;
  inactiveEmployees: Employee[];
  getEmployeeName: (empId: string | null) => string;
  restoreEmployee: { mutateAsync: (id: string) => Promise<unknown>; isPending: boolean };
  permanentDeleteEmployee: { mutateAsync: (id: string) => Promise<unknown>; isPending: boolean };
  setSelectedIds: (ids: string[]) => void;
}

export function EmployeeTreeTable({
  ceoList,
  organizationGroups,
  selectedIds,
  onSelectAll,
  onSelectOne,
  onEditEmployee,
  onOpenOverride,
  isF1,
  showInactive,
  inactiveEmployees,
  getEmployeeName,
  restoreEmployee,
  permanentDeleteEmployee,
  setSelectedIds,
}: Props) {
  const [collapsedOrgs, setCollapsedOrgs] = useState<Set<string>>(new Set());

  const toggleOrgCollapse = (orgName: string) => {
    setCollapsedOrgs((prev) => {
      const next = new Set(prev);
      if (next.has(orgName)) next.delete(orgName);
      else next.add(orgName);
      return next;
    });
  };

  return (
    <>
      {/* CEO section */}
      {ceoList.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-4 py-3 font-semibold text-base flex items-center justify-between">
            <span>대표</span>
            <span className="text-sm text-muted-foreground">{ceoList.length}명</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="py-2 px-2 w-10">
                  <input
                    type="checkbox"
                    checked={ceoList.every((e) => selectedIds.includes(e.id))}
                    onChange={(e) => onSelectAll(e.target.checked, ceoList)}
                    className="rounded border-zinc-300"
                  />
                </th>
                <th className="text-left py-2 px-2 font-medium text-zinc-500 dark:text-zinc-400 w-[100px]">이름</th>
                <th className="text-left py-2 px-2 font-medium text-zinc-500 dark:text-zinc-400 w-[80px]">직급</th>
                <th className="text-left py-2 px-2 font-medium text-zinc-500 dark:text-zinc-400 w-[70px]">보안등급</th>
                <th className="text-left py-2 px-2 font-medium text-zinc-500 dark:text-zinc-400">이메일</th>
                {isF1 && <th className="text-center py-2 px-2 font-medium text-zinc-500 dark:text-zinc-400 w-[60px]">권한</th>}
              </tr>
            </thead>
            <tbody>
              {ceoList.map((employee) => (
                <tr key={employee.id} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-muted/40">
                  <td className="py-2 px-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(employee.id)}
                      onChange={(e) => onSelectOne(employee.id, e.target.checked)}
                      className="rounded border-zinc-300"
                    />
                  </td>
                  <td className="py-2 px-2 text-zinc-900 dark:text-white font-medium">
                    <span className="cursor-pointer hover:underline text-primary" onClick={() => onEditEmployee(employee)}>
                      {employee.fullName}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-zinc-600 dark:text-zinc-400">{employee.positionName || "-"}</td>
                  <td className="py-2 px-2">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-md border ${getSecurityLevelBadge(employee.securityLevel)}`}>
                      {employee.securityLevel}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-zinc-600 dark:text-zinc-400 truncate">{employee.email}</td>
                  {isF1 && (
                    <td className="py-2 px-2 text-center">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onOpenOverride(employee)} title="메뉴 권한 오버라이드">
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Organization sections */}
      {organizationGroups.map((group) => (
        <div key={group.orgId ?? 'no-org'} className="border rounded-lg overflow-hidden">
          <button
            className="w-full bg-muted/50 px-4 py-3 font-semibold text-base flex items-center justify-between hover:bg-muted/70 transition-colors"
            onClick={() => toggleOrgCollapse(group.orgName)}
          >
            <div className="flex items-center gap-2">
              {collapsedOrgs.has(group.orgName) ? <ChevronRight className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              <span>{group.orgName}</span>
              {isDirectOrg(group.orgName) && <span className="text-sm text-muted-foreground">(대표 직속)</span>}
            </div>
            <span className="text-sm text-muted-foreground">{group.members.length}명</span>
          </button>
          {!collapsedOrgs.has(group.orgName) && (
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b">
                <tr>
                  <th className="py-2 px-2 w-10">
                    <input
                      type="checkbox"
                      checked={group.members.every((e) => selectedIds.includes(e.id))}
                      onChange={(e) => onSelectAll(e.target.checked, group.members)}
                      className="rounded border-zinc-300"
                    />
                  </th>
                  <th className="text-left py-2 px-2 font-medium text-zinc-500 dark:text-zinc-400 w-[100px]">이름</th>
                  <th className="text-left py-2 px-2 font-medium text-zinc-500 dark:text-zinc-400 w-[80px]">직급</th>
                  <th className="text-left py-2 px-2 font-medium text-zinc-500 dark:text-zinc-400 w-[80px]">상위자</th>
                  <th className="text-left py-2 px-2 font-medium text-zinc-500 dark:text-zinc-400 w-[70px]">보안등급</th>
                  <th className="text-left py-2 px-2 font-medium text-zinc-500 dark:text-zinc-400">이메일</th>
                  {isF1 && <th className="text-center py-2 px-2 font-medium text-zinc-500 dark:text-zinc-400 w-[60px]">권한</th>}
                </tr>
              </thead>
              <tbody>
                {group.members.map((employee) => (
                  <tr key={employee.id} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-muted/40">
                    <td className="py-2 px-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(employee.id)}
                        onChange={(e) => onSelectOne(employee.id, e.target.checked)}
                        className="rounded border-zinc-300"
                      />
                    </td>
                    <td className="py-2 px-2 text-zinc-900 dark:text-white font-medium">
                      <span className="cursor-pointer hover:underline text-primary" onClick={() => onEditEmployee(employee)}>
                        {employee.fullName}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-zinc-600 dark:text-zinc-400">{employee.positionName || "-"}</td>
                    <td className="py-2 px-2 text-zinc-600 dark:text-zinc-400">{getEmployeeName(employee.parentId)}</td>
                    <td className="py-2 px-2">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-md border ${getSecurityLevelBadge(employee.securityLevel)}`}>
                        {employee.securityLevel}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-zinc-600 dark:text-zinc-400 truncate">{employee.email}</td>
                    {isF1 && (
                      <td className="py-2 px-2 text-center">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onOpenOverride(employee)} title="메뉴 권한 오버라이드">
                          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}

      {/* Inactive restore/delete */}
      {showInactive && selectedIds.length > 0 && (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              if (!window.confirm(`선택한 ${selectedIds.length}명의 사원을 복원하시겠습니까?`)) return;
              try {
                for (const id of selectedIds) {
                  await restoreEmployee.mutateAsync(id);
                }
                setSelectedIds([]);
              } catch { /* global onError toast */ }
            }}
            className="text-green-500 hover:text-green-600"
            disabled={restoreEmployee.isPending}
          >
            {restoreEmployee.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
            선택 복원 ({selectedIds.length}명)
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              if (!window.confirm(`선택한 ${selectedIds.length}명의 사원을 완전히 삭제하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다.`)) return;
              const failed: string[] = [];
              for (const id of selectedIds) {
                try {
                  await permanentDeleteEmployee.mutateAsync(id);
                } catch (error) {
                  const name = inactiveEmployees.find((e) => e.id === id)?.fullName || id;
                  const reason = error instanceof Error ? error.message : "알 수 없는 오류";
                  failed.push(`${name}: ${reason}`);
                }
              }
              setSelectedIds([]);
              if (failed.length > 0) {
                alert(`삭제 실패:\n\n${failed.join("\n")}`);
              }
            }}
            className="text-red-500 hover:text-red-600"
            disabled={permanentDeleteEmployee.isPending}
          >
            {permanentDeleteEmployee.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            완전 삭제 ({selectedIds.length}명)
          </Button>
        </div>
      )}
    </>
  );
}
