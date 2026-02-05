import { useState } from "react";
import {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  useRestoreEmployee,
  usePermanentDeleteEmployee,
} from "@/hooks/useEmployees";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  FileSpreadsheet,
  RotateCcw,
  Users,
  UserX,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { EmployeeExcelUpload } from "@/components/employees/EmployeeExcelUpload";
import type { Employee, CreateEmployeeInput } from "@/types/employee";
import { SECURITY_LEVELS } from "@/types/employee";

export function EmployeesPage() {
  const { employee: currentEmployee } = useAuthStore();
  const isF1 = currentEmployee?.securityLevel === "F1";

  const { data: employees, isLoading } = useEmployees();
  const { data: organizations } = useOrganizations();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();
  const restoreEmployee = useRestoreEmployee();
  const permanentDeleteEmployee = usePermanentDeleteEmployee();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExcelUploadOpen, setIsExcelUploadOpen] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkEditData, setBulkEditData] = useState({
    securityLevel: "",
    organizationId: "",
    positionName: "",
    parentId: "",
  });

  const [formData, setFormData] = useState<CreateEmployeeInput>({
    email: "",
    fullName: "",
    securityLevel: "F5",
    parentId: null,
    organizationId: null,
    positionName: "",
    department: "",
  });

  // 조직 ID로 조직명 찾기
  const getOrganizationName = (orgId: number | null | undefined) => {
    if (!orgId || !organizations) return "-";
    return organizations.find((o) => o.id === orgId)?.name || "-";
  };

  // 활성/비활성 사원 분리 (isActive가 null인 경우 활성으로 처리)
  const activeEmployees = employees?.filter((emp) => emp.isActive !== false) || [];
  const inactiveEmployees = employees?.filter((emp) => emp.isActive === false) || [];

  // 직급 우선순위 (낮을수록 상단)
  const getPositionPriority = (position: string | null): number => {
    const priorities: Record<string, number> = {
      대표: 1,
      총괄이사: 2,
      사업단장: 3,
      지점장: 4,
      팀장: 5,
      FC: 6,
      실장: 10,
      과장: 11,
      대리: 12,
      주임: 13,
      사원: 14,
    };
    return priorities[position || ""] || 99;
  };

  // 대표 직속 조직 여부 (영업지원팀, 총무팀)
  const isDirectOrg = (orgName: string) => {
    return ["영업지원팀", "총무팀"].includes(orgName);
  };

  // 조직 정렬 우선순위
  const getOrgPriority = (orgName: string): number => {
    if (orgName === "영업지원팀") return 1;
    if (orgName === "총무팀") return 2;
    return 10; // 사업단 등
  };

  // 현재 보기 모드에 따른 필터링
  const currentList = showInactive ? inactiveEmployees : activeEmployees;
  const searchFiltered = currentList.filter(
    (emp) =>
      emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 대표 추출 (조직 무관하게 최상위)
  const ceoList = searchFiltered
    .filter((emp) => emp.positionName === "대표")
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  // 나머지 사원 (대표 제외)
  const nonCeoList = searchFiltered.filter((emp) => emp.positionName !== "대표");

  // 사원 ID로 사원명 찾기 (상위자)
  const getEmployeeName = (empId: string | null) => {
    if (!empId || !employees) return "-";
    return employees.find((e) => e.id === empId)?.fullName || "-";
  };

  // 트리 순회 정렬 (상위자 → 하위자 순서로 연속 배치)
  const buildTreeSortedList = (empList: Employee[]): Employee[] => {
    const result: Employee[] = [];
    const visited = new Set<string>();

    const addWithChildren = (emp: Employee) => {
      if (visited.has(emp.id)) return;
      visited.add(emp.id);
      result.push(emp);

      // 이 사원의 하위자들 찾아서 바로 아래에 추가 (직급 순)
      const children = empList
        .filter((e) => e.parentId === emp.id && !visited.has(e.id))
        .sort((a, b) => getPositionPriority(a.positionName) - getPositionPriority(b.positionName));
      children.forEach((child) => addWithChildren(child));
    };

    // 루트 사원 찾기 (상위자가 없거나 상위자가 목록에 없는 경우)
    const roots = empList
      .filter((emp) => !emp.parentId || !empList.some((e) => e.id === emp.parentId))
      .sort((a, b) => getPositionPriority(a.positionName) - getPositionPriority(b.positionName));

    roots.forEach((root) => addWithChildren(root));

    // 남은 사원 추가 (순환 참조 방지)
    empList
      .filter((emp) => !visited.has(emp.id))
      .sort((a, b) => getPositionPriority(a.positionName) - getPositionPriority(b.positionName))
      .forEach((emp) => addWithChildren(emp));

    return result;
  };

  type OrgGroup = {
    orgName: string;
    orgId: number | null;
    members: Employee[];
  };

  // 조직별 그룹핑 + 트리 정렬
  const groupByOrganization = (): OrgGroup[] => {
    const groups: OrgGroup[] = [];
    const byOrg = new Map<number | null, Employee[]>();

    nonCeoList.forEach((emp) => {
      const orgId = emp.organizationId || null;
      if (!byOrg.has(orgId)) byOrg.set(orgId, []);
      byOrg.get(orgId)!.push(emp);
    });

    Array.from(byOrg.entries()).forEach(([orgId, members]) => {
      const orgName = getOrganizationName(orgId);
      // 트리 정렬 적용
      const sortedMembers = buildTreeSortedList(members);
      groups.push({
        orgName,
        orgId,
        members: sortedMembers,
      });
    });

    // 대표 직속 조직 먼저, 그 다음 사업단
    return groups.sort((a, b) => {
      const priorityA = getOrgPriority(a.orgName);
      const priorityB = getOrgPriority(b.orgName);
      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.orgName.localeCompare(b.orgName);
    });
  };

  const organizationGroups = groupByOrganization();
  const [collapsedOrgs, setCollapsedOrgs] = useState<Set<string>>(new Set());

  const toggleOrgCollapse = (orgName: string) => {
    setCollapsedOrgs((prev) => {
      const next = new Set(prev);
      if (next.has(orgName)) {
        next.delete(orgName);
      } else {
        next.add(orgName);
      }
      return next;
    });
  };

  // 전체 사원 목록 (체크박스용)
  const allFilteredEmployees = [...ceoList, ...nonCeoList];

  const handleOpenSheet = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        email: employee.email,
        fullName: employee.fullName,
        securityLevel:
          employee.securityLevel as CreateEmployeeInput["securityLevel"],
        parentId: employee.parentId || null,
        organizationId: employee.organizationId || null,
        positionName: employee.positionName || "",
        department: employee.department || "",
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        email: "",
        fullName: "",
        securityLevel: "F5",
        parentId: null,
        organizationId: null,
        positionName: "",
        department: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEmployee) {
        await updateEmployee.mutateAsync({
          id: editingEmployee.id,
          input: {
            // F1만 이메일 수정 가능
            ...(isF1 && formData.email !== editingEmployee.email
              ? { email: formData.email }
              : {}),
            fullName: formData.fullName,
            securityLevel: formData.securityLevel,
            parentId: formData.parentId || null,
            organizationId: formData.organizationId || null,
            positionName: formData.positionName || null,
            department: formData.department || null,
          },
        });
      } else {
        await createEmployee.mutateAsync(formData);
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Failed to save employee:", error);
    }
  };

  const handleSelectAll = (checked: boolean, members: Employee[]) => {
    if (checked) {
      const newIds = members.map((e) => e.id);
      setSelectedIds((prev) => [...new Set([...prev, ...newIds])]);
    } else {
      const memberIds = new Set(members.map((e) => e.id));
      setSelectedIds((prev) => prev.filter((id) => !memberIds.has(id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`선택한 ${selectedIds.length}명의 사원을 비활성화하시겠습니까?`)) return;

    try {
      for (const id of selectedIds) {
        await deleteEmployee.mutateAsync(id);
      }
      setSelectedIds([]);
    } catch (error) {
      console.error("Failed to bulk delete:", error);
    }
  };

  const handleEditSelected = () => {
    if (selectedIds.length === 1) {
      const emp = employees?.find((e) => e.id === selectedIds[0]);
      if (emp) handleOpenSheet(emp);
    } else {
      setIsBulkEditOpen(true);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleBulkEdit = async () => {
    if (selectedIds.length === 0) return;

    try {
      for (const id of selectedIds) {
        const input: Record<string, unknown> = {};
        if (bulkEditData.securityLevel) {
          input.securityLevel = bulkEditData.securityLevel;
        }
        if (bulkEditData.organizationId) {
          input.organizationId = parseInt(bulkEditData.organizationId);
        }
        if (bulkEditData.positionName) {
          input.positionName = bulkEditData.positionName;
        }
        if (bulkEditData.parentId) {
          input.parentId = bulkEditData.parentId;
        }
        if (Object.keys(input).length > 0) {
          await updateEmployee.mutateAsync({ id, input });
        }
      }
      setIsBulkEditOpen(false);
      setSelectedIds([]);
      setBulkEditData({
        securityLevel: "",
        organizationId: "",
        positionName: "",
        parentId: "",
      });
    } catch (error) {
      console.error("Failed to bulk edit:", error);
    }
  };

  const getSecurityLevelBadge = (level: string) => {
    const colors: Record<string, string> = {
      F1: "bg-red-500/10 text-red-500 border-red-500/20",
      F2: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      F3: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      F4: "bg-green-500/10 text-green-500 border-green-500/20",
      F5: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    };
    return colors[level] || colors.F5;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {/* Actions (Title removed) */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <>
              <Button variant="outline" onClick={handleEditSelected}>
                <Pencil className="mr-2 h-4 w-4" />
                {selectedIds.length === 1 ? "수정" : `일괄 수정 (${selectedIds.length}명)`}
              </Button>
              <Button
                variant="outline"
                onClick={handleBulkDelete}
                className="text-red-500 hover:text-red-600"
                disabled={deleteEmployee.isPending}
              >
                {deleteEmployee.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                비활성화 ({selectedIds.length}명)
              </Button>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsExcelUploadOpen(true)}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel 업로드
          </Button>
          <Button onClick={() => handleOpenSheet()}>
            <Plus className="mr-2 h-4 w-4" />
            사원 등록
          </Button>
        </div>
      </div>

      {/* Tabs for Active/Inactive */}
      <div className="flex gap-2">
        <Button
          variant={!showInactive ? "default" : "outline"}
          onClick={() => setShowInactive(false)}
          className="gap-2"
        >
          <Users className="h-4 w-4" />
          활성 사원
          <span className="ml-1 text-xs bg-white/20 dark:bg-black/20 px-2 py-0.5 rounded-full">
            {activeEmployees.length}
          </span>
        </Button>
        <Button
          variant={showInactive ? "default" : "outline"}
          onClick={() => setShowInactive(true)}
          className="gap-2"
        >
          <UserX className="h-4 w-4" />
          비활성 사원
          <span className="ml-1 text-xs bg-white/20 dark:bg-black/20 px-2 py-0.5 rounded-full">
            {inactiveEmployees.length}
          </span>
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          placeholder="이름 또는 이메일로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white dark:bg-zinc-900"
        />
      </div>

      {/* Employee List */}
      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-zinc-900 dark:text-white">
            {showInactive ? "비활성 사원 목록" : "사원 목록"}
          </CardTitle>
          <CardDescription>
            {showInactive
              ? `비활성화된 사원 ${allFilteredEmployees.length}명`
              : `총 ${allFilteredEmployees.length}명`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {allFilteredEmployees.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              {showInactive ? (
                <>
                  <UserX className="h-12 w-12 mx-auto mb-4 text-zinc-300" />
                  <p>비활성화된 사원이 없습니다</p>
                </>
              ) : (
                <>
                  <Users className="h-12 w-12 mx-auto mb-4 text-zinc-300" />
                  <p>등록된 사원이 없습니다</p>
                  <p className="text-sm mt-1">
                    사원을 등록하여 시스템을 시작하세요
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              {/* 대표 섹션 */}
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
                            onChange={(e) => handleSelectAll(e.target.checked, ceoList)}
                            className="rounded border-zinc-300"
                          />
                        </th>
                        <th className="text-left py-2 px-2 font-medium text-zinc-500 dark:text-zinc-400 w-[100px]">이름</th>
                        <th className="text-left py-2 px-2 font-medium text-zinc-500 dark:text-zinc-400 w-[80px]">직급</th>
                        <th className="text-left py-2 px-2 font-medium text-zinc-500 dark:text-zinc-400 w-[70px]">보안등급</th>
                        <th className="text-left py-2 px-2 font-medium text-zinc-500 dark:text-zinc-400">이메일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ceoList.map((employee) => (
                        <tr
                          key={employee.id}
                          className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-muted/40"
                        >
                          <td className="py-2 px-2">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(employee.id)}
                              onChange={(e) => handleSelectOne(employee.id, e.target.checked)}
                              className="rounded border-zinc-300"
                            />
                          </td>
                          <td className="py-2 px-2 text-zinc-900 dark:text-white font-medium">
                            <span
                              className="cursor-pointer hover:underline text-primary"
                              onClick={() => handleOpenSheet(employee)}
                            >
                              {employee.fullName}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-zinc-600 dark:text-zinc-400">
                            {employee.positionName || "-"}
                          </td>
                          <td className="py-2 px-2">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-md border ${getSecurityLevelBadge(employee.securityLevel)}`}>
                              {employee.securityLevel}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-zinc-600 dark:text-zinc-400 truncate">
                            {employee.email}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 조직별 섹션 */}
              {organizationGroups.map((group) => (
                <div key={group.orgId ?? 'no-org'} className="border rounded-lg overflow-hidden">
                  <button
                    className="w-full bg-muted/50 px-4 py-3 font-semibold text-base flex items-center justify-between hover:bg-muted/70 transition-colors"
                    onClick={() => toggleOrgCollapse(group.orgName)}
                  >
                    <div className="flex items-center gap-2">
                      {collapsedOrgs.has(group.orgName) ? (
                        <ChevronRight className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                      <span>{group.orgName}</span>
                      {isDirectOrg(group.orgName) && (
                        <span className="text-sm text-muted-foreground">(대표 직속)</span>
                      )}
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
                              onChange={(e) => handleSelectAll(e.target.checked, group.members)}
                              className="rounded border-zinc-300"
                            />
                          </th>
                          <th className="text-left py-2 px-2 font-medium text-zinc-500 dark:text-zinc-400 w-[100px]">이름</th>
                          <th className="text-left py-2 px-2 font-medium text-zinc-500 dark:text-zinc-400 w-[80px]">직급</th>
                          <th className="text-left py-2 px-2 font-medium text-zinc-500 dark:text-zinc-400 w-[80px]">상위자</th>
                          <th className="text-left py-2 px-2 font-medium text-zinc-500 dark:text-zinc-400 w-[70px]">보안등급</th>
                          <th className="text-left py-2 px-2 font-medium text-zinc-500 dark:text-zinc-400">이메일</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.members.map((employee) => (
                          <tr
                            key={employee.id}
                            className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-muted/40"
                          >
                            <td className="py-2 px-2">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(employee.id)}
                                onChange={(e) => handleSelectOne(employee.id, e.target.checked)}
                                className="rounded border-zinc-300"
                              />
                            </td>
                            <td className="py-2 px-2 text-zinc-900 dark:text-white font-medium">
                              <span
                                className="cursor-pointer hover:underline text-primary"
                                onClick={() => handleOpenSheet(employee)}
                              >
                                {employee.fullName}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-zinc-600 dark:text-zinc-400">
                              {employee.positionName || "-"}
                            </td>
                            <td className="py-2 px-2 text-zinc-600 dark:text-zinc-400">
                              {getEmployeeName(employee.parentId)}
                            </td>
                            <td className="py-2 px-2">
                              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-md border ${getSecurityLevelBadge(employee.securityLevel)}`}>
                                {employee.securityLevel}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-zinc-600 dark:text-zinc-400 truncate">
                              {employee.email}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}

              {/* 비활성 사원 복원/삭제 버튼 (비활성 탭에서만) */}
              {showInactive && selectedIds.length > 0 && (
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!window.confirm(`선택한 ${selectedIds.length}명의 사원을 복원하시겠습니까?`)) return;
                      for (const id of selectedIds) {
                        await restoreEmployee.mutateAsync(id);
                      }
                      setSelectedIds([]);
                    }}
                    className="text-green-500 hover:text-green-600"
                    disabled={restoreEmployee.isPending}
                  >
                    {restoreEmployee.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="mr-2 h-4 w-4" />
                    )}
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
                    {permanentDeleteEmployee.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    완전 삭제 ({selectedIds.length}명)
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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
                  // 총괄이사 선택 시 상위자를 대표로 자동 지정
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
                onClick={() => setIsDialogOpen(false)}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createEmployee.isPending || updateEmployee.isPending}
              >
                {(createEmployee.isPending || updateEmployee.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingEmployee ? "수정" : "등록"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Excel Upload */}
      <EmployeeExcelUpload
        isOpen={isExcelUploadOpen}
        onClose={() => setIsExcelUploadOpen(false)}
      />

      {/* Bulk Edit Dialog */}
      <Dialog open={isBulkEditOpen} onOpenChange={setIsBulkEditOpen}>
        <DialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-white">
              일괄 수정 ({selectedIds.length}명)
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
                    // 조직 변경 시 상위자 초기화 (선택 사항)
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
                onClick={() => setIsBulkEditOpen(false)}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                onClick={handleBulkEdit}
                className="flex-1"
                disabled={
                  updateEmployee.isPending ||
                  (!bulkEditData.securityLevel &&
                    !bulkEditData.organizationId &&
                    !bulkEditData.positionName &&
                    !bulkEditData.parentId)
                }
              >
                {updateEmployee.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                일괄 적용
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
