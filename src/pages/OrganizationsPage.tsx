import { useState } from "react";
import {
  useOrganizations,
  useCreateOrganization,
  useUpdateOrganization,
  useDeleteOrganization,
} from "@/hooks/useOrganizations";
import { useEmployees } from "@/hooks/useEmployees";
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
import { Plus, Pencil, Trash2, Loader2, Building2, Users } from "lucide-react";
import type {
  Organization,
  CreateOrganizationInput,
} from "@/services/organizations";

export function OrganizationsPage() {
  const { employee } = useAuthStore();
  const { data: organizations, isLoading } = useOrganizations();
  const { data: employees } = useEmployees();
  const createOrganization = useCreateOrganization();
  const updateOrganization = useUpdateOrganization();
  const deleteOrganization = useDeleteOrganization();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [formData, setFormData] = useState<CreateOrganizationInput>({
    name: "",
    parentId: null,
    managerId: null,
  });

  // F1만 수정 가능
  const isF1 = employee?.securityLevel === "F1";

  // F2~F5는 본인 소속 조직만 필터링
  const visibleOrganizations = isF1
    ? organizations
    : organizations?.filter((org) => org.id === employee?.organizationId);

  // F2~F5는 읽기 전용
  const isReadOnly = !isF1;

  const activeEmployees = employees?.filter((e) => e.isActive) || [];

  const handleOpenDialog = (org?: Organization) => {
    if (org) {
      setEditingOrg(org);
      setFormData({
        name: org.name,
        parentId: org.parentId,
        managerId: org.managerId,
      });
    } else {
      setEditingOrg(null);
      setFormData({ name: "", parentId: null, managerId: null });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingOrg) {
        await updateOrganization.mutateAsync({
          id: editingOrg.id,
          input: formData,
        });
      } else {
        await createOrganization.mutateAsync(formData);
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Failed to save organization:", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("정말 이 조직을 삭제하시겠습니까?")) {
      try {
        await deleteOrganization.mutateAsync(id);
      } catch (error) {
        console.error("Failed to delete organization:", error);
      }
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
      {/* Actions (Title removed) */}
      {!isReadOnly && (
        <div className="flex justify-end mb-4">
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            조직 추가
          </Button>
        </div>
      )}

      {/* Organization List */}
      <Card className="border-border bg-card rounded-xl shadow-lg">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            조직 목록
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            총 {visibleOrganizations?.length || 0}개
            {isReadOnly && " (읽기 전용)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {visibleOrganizations?.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>등록된 조직이 없습니다</p>
              {!isReadOnly && (
                <p className="text-sm mt-1">
                  조직을 추가하여 사원을 배치하세요
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {visibleOrganizations?.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between py-4 hover:bg-secondary/50 px-4 -mx-4 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{org.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        {org.managerName && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            담당: {org.managerName}
                          </span>
                        )}
                        {org.parentId && (
                          <span>
                            상위:{" "}
                            {organizations?.find((o) => o.id === org.parentId)
                              ?.name || "-"}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  {!isReadOnly && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(org)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(org.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-white">
              {editingOrg ? "조직 수정" : "조직 추가"}
            </DialogTitle>
            <DialogDescription>
              {editingOrg
                ? "조직 정보를 수정합니다"
                : "새로운 조직을 추가합니다"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">조직명 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="bg-white dark:bg-zinc-800"
                placeholder="예: 영업1팀"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentId">상위 조직</Label>
              <select
                id="parentId"
                value={formData.parentId || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    parentId: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                className="w-full h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
              >
                <option value="">없음 (최상위)</option>
                {organizations
                  ?.filter((o) => o.id !== editingOrg?.id)
                  .map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="managerId">담당자</Label>
              <select
                id="managerId"
                value={formData.managerId || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    managerId: e.target.value || null,
                  })
                }
                className="w-full h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
              >
                <option value="">선택 안함</option>
                {activeEmployees.map((emp) => (
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
                onClick={() => setIsDialogOpen(false)}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={
                  createOrganization.isPending || updateOrganization.isPending
                }
              >
                {(createOrganization.isPending ||
                  updateOrganization.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingOrg ? "수정" : "추가"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
