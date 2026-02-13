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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Users, UserX } from "lucide-react";
import { EmployeeExcelUpload } from "@/components/employees/EmployeeExcelUpload";
import { EmployeeToolbar } from "@/components/employees/EmployeeToolbar";
import { EmployeeTreeTable, groupByOrganization } from "@/components/employees/EmployeeTreeTable";
import { EmployeeFormDialog } from "@/components/employees/EmployeeFormDialog";
import { MenuOverrideDialog } from "@/components/employees/MenuOverrideDialog";
import { BulkEditDialog } from "@/components/employees/BulkEditDialog";
import type { BulkEditData } from "@/components/employees/BulkEditDialog";
import type { Employee, CreateEmployeeInput } from "@/types/employee";
import { useIsEditor } from "@/hooks/useMenuRole";

export function EmployeesPage() {
  const isF1 = useIsEditor('/settings/employees');

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
  const [bulkEditData, setBulkEditData] = useState<BulkEditData>({
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

  // Menu Override Dialog
  const [overrideEmployee, setOverrideEmployee] = useState<Employee | null>(null);

  // Helper functions
  const getOrganizationName = (orgId: number | null | undefined) => {
    if (!orgId || !organizations) return "-";
    return organizations.find((o) => o.id === orgId)?.name || "-";
  };

  const getEmployeeName = (empId: string | null) => {
    if (!empId || !employees) return "-";
    return employees.find((e) => e.id === empId)?.fullName || "-";
  };

  // Filter logic
  const activeEmployees = employees?.filter((emp) => emp.isActive !== false) || [];
  const inactiveEmployees = employees?.filter((emp) => emp.isActive === false) || [];
  const currentList = showInactive ? inactiveEmployees : activeEmployees;
  const searchFiltered = currentList.filter(
    (emp) =>
      emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ceoList = searchFiltered
    .filter((emp) => emp.positionName === "대표")
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
  const nonCeoList = searchFiltered.filter((emp) => emp.positionName !== "대표");
  const allFilteredEmployees = [...ceoList, ...nonCeoList];
  const organizationGroups = groupByOrganization(nonCeoList, getOrganizationName);

  // Handlers
  const handleOpenSheet = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        email: employee.email,
        fullName: employee.fullName,
        securityLevel: employee.securityLevel as CreateEmployeeInput["securityLevel"],
        parentId: employee.parentId || null,
        organizationId: employee.organizationId || null,
        positionName: employee.positionName || "",
        department: employee.department || "",
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        email: "", fullName: "", securityLevel: "F5",
        parentId: null, organizationId: null, positionName: "", department: "",
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
            ...(isF1 && formData.email !== editingEmployee.email ? { email: formData.email } : {}),
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

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) setSelectedIds((prev) => [...prev, id]);
    else setSelectedIds((prev) => prev.filter((i) => i !== id));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`선택한 ${selectedIds.length}명의 사원을 비활성화하시겠습니까?`)) return;
    try {
      for (const id of selectedIds) await deleteEmployee.mutateAsync(id);
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

  const handleBulkEdit = async () => {
    if (selectedIds.length === 0) return;
    try {
      for (const id of selectedIds) {
        const input: Record<string, unknown> = {};
        if (bulkEditData.securityLevel) input.securityLevel = bulkEditData.securityLevel;
        if (bulkEditData.organizationId) input.organizationId = parseInt(bulkEditData.organizationId);
        if (bulkEditData.positionName) input.positionName = bulkEditData.positionName;
        if (bulkEditData.parentId) input.parentId = bulkEditData.parentId;
        if (Object.keys(input).length > 0) await updateEmployee.mutateAsync({ id, input });
      }
      setIsBulkEditOpen(false);
      setSelectedIds([]);
      setBulkEditData({ securityLevel: "", organizationId: "", positionName: "", parentId: "" });
    } catch (error) {
      console.error("Failed to bulk edit:", error);
    }
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
      <EmployeeToolbar
        selectedCount={selectedIds.length}
        onEditSelected={handleEditSelected}
        onBulkDelete={handleBulkDelete}
        isDeletePending={deleteEmployee.isPending}
        onExcelUpload={() => setIsExcelUploadOpen(true)}
        onAddEmployee={() => handleOpenSheet()}
        showInactive={showInactive}
        setShowInactive={setShowInactive}
        activeCount={activeEmployees.length}
        inactiveCount={inactiveEmployees.length}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

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
                  <p className="text-sm mt-1">사원을 등록하여 시스템을 시작하세요</p>
                </>
              )}
            </div>
          ) : (
            <EmployeeTreeTable
              ceoList={ceoList}
              organizationGroups={organizationGroups}
              selectedIds={selectedIds}
              onSelectAll={handleSelectAll}
              onSelectOne={handleSelectOne}
              onEditEmployee={handleOpenSheet}
              onOpenOverride={setOverrideEmployee}
              isF1={isF1}
              showInactive={showInactive}
              inactiveEmployees={inactiveEmployees}
              getEmployeeName={getEmployeeName}
              restoreEmployee={restoreEmployee}
              permanentDeleteEmployee={permanentDeleteEmployee}
              setSelectedIds={setSelectedIds}
            />
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <EmployeeFormDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingEmployee={editingEmployee}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        isPending={createEmployee.isPending || updateEmployee.isPending}
        isF1={isF1}
        organizations={organizations}
        employees={employees}
        getOrganizationName={getOrganizationName}
      />

      <EmployeeExcelUpload
        isOpen={isExcelUploadOpen}
        onClose={() => setIsExcelUploadOpen(false)}
      />

      <MenuOverrideDialog
        employee={overrideEmployee}
        onClose={() => setOverrideEmployee(null)}
      />

      <BulkEditDialog
        isOpen={isBulkEditOpen}
        onOpenChange={setIsBulkEditOpen}
        selectedCount={selectedIds.length}
        selectedIds={selectedIds}
        bulkEditData={bulkEditData}
        setBulkEditData={setBulkEditData}
        onSubmit={handleBulkEdit}
        isPending={updateEmployee.isPending}
        organizations={organizations}
        employees={employees}
        getOrganizationName={getOrganizationName}
      />
    </div>
  );
}
