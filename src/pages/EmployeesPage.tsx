import { useState } from "react";
import {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  useRestoreEmployee,
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
  Settings2,
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

  // 사원 ID로 사원명 찾기 (상위자)
  const getEmployeeName = (empId: string | null) => {
    if (!empId || !employees) return "-";
    return employees.find((e) => e.id === empId)?.fullName || "-";
  };

  // 활성/비활성 사원 분리
  const activeEmployees = employees?.filter((emp) => emp.isActive) || [];
  const inactiveEmployees = employees?.filter((emp) => !emp.isActive) || [];

  // 현재 보기 모드에 따른 필터링
  const currentList = showInactive ? inactiveEmployees : activeEmployees;
  const filteredEmployees = currentList.filter(
    (emp) =>
      emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const handleDelete = async (id: string) => {
    if (window.confirm("정말 이 사원을 비활성화하시겠습니까?")) {
      try {
        await deleteEmployee.mutateAsync(id);
      } catch (error) {
        console.error("Failed to delete employee:", error);
      }
    }
  };

  const handleRestore = async (id: string) => {
    if (window.confirm("이 사원을 다시 활성화하시겠습니까?")) {
      try {
        await restoreEmployee.mutateAsync(id);
      } catch (error) {
        console.error("Failed to restore employee:", error);
      }
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredEmployees.map((e) => e.id));
    } else {
      setSelectedIds([]);
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
      <div className="flex justify-end gap-2 mb-4">
        {selectedIds.length > 0 && (
          <Button variant="outline" onClick={() => setIsBulkEditOpen(true)}>
            <Settings2 className="mr-2 h-4 w-4" />
            일괄 수정 ({selectedIds.length}명)
          </Button>
        )}
        <Button variant="outline" onClick={() => setIsExcelUploadOpen(true)}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Excel 업로드
        </Button>
        <Button onClick={() => handleOpenSheet()}>
          <Plus className="mr-2 h-4 w-4" />
          사원 등록
        </Button>
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
              ? `비활성화된 사원 ${filteredEmployees.length}명`
              : `총 ${filteredEmployees.length}명`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEmployees.length === 0 ? (
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="py-2 px-2 w-10">
                      <input
                        type="checkbox"
                        checked={
                          filteredEmployees.length > 0 &&
                          selectedIds.length === filteredEmployees.length
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-zinc-300"
                      />
                    </th>
                    <th className="text-left py-2 px-2 font-medium text-zinc-500 dark:text-zinc-400 w-[80px]">
                      이름
                    </th>
                    <th className="text-left py-2 px-2 font-medium text-zinc-500 dark:text-zinc-400 w-[80px]">
                      직급
                    </th>
                    <th className="text-left py-2 px-2 font-medium text-zinc-500 dark:text-zinc-400 w-[80px]">
                      상위자
                    </th>
                    <th className="text-left py-2 px-2 font-medium text-zinc-500 dark:text-zinc-400 w-[70px]">
                      보안등급
                    </th>
                    <th className="text-left py-2 px-2 font-medium text-zinc-500 dark:text-zinc-400">
                      이메일
                    </th>
                    <th className="text-right py-2 px-2 font-medium text-zinc-500 dark:text-zinc-400 w-[80px]">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees?.map((employee) => (
                    <tr
                      key={employee.id}
                      className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-muted/40 odd:bg-muted/20"
                    >
                      <td className="py-2 px-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(employee.id)}
                          onChange={(e) =>
                            handleSelectOne(employee.id, e.target.checked)
                          }
                          className="rounded border-zinc-300"
                        />
                      </td>
                      <td className="py-2 px-2 text-zinc-900 dark:text-white font-medium whitespace-nowrap">
                        <span
                          className="cursor-pointer hover:underline text-primary"
                          onClick={() => handleOpenSheet(employee)}
                        >
                          {employee.fullName}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                        {employee.positionName || "-"}
                      </td>
                      <td className="py-2 px-2 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                        {getEmployeeName(employee.parentId)}
                      </td>
                      <td className="py-2 px-2">
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-md border ${getSecurityLevelBadge(
                            employee.securityLevel
                          )}`}
                        >
                          {employee.securityLevel}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-zinc-600 dark:text-zinc-400 truncate">
                        {employee.email}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <div className="flex justify-end gap-2">
                          {showInactive ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRestore(employee.id)}
                              className="h-8 w-8 text-green-500 hover:text-green-600"
                              title="사원 복원"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenSheet(employee)}
                                className="h-8 w-8"
                                title="수정"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(employee.id)}
                                className="h-8 w-8 text-red-500 hover:text-red-600"
                                title="비활성화"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                onChange={(e) =>
                  setFormData({ ...formData, positionName: e.target.value })
                }
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
                  (!bulkEditData.securityLevel && !bulkEditData.organizationId)
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
