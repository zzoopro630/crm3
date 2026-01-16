import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useUpdateEmployee } from "@/hooks/useEmployees";
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
import { Loader2, User, Save } from "lucide-react";

export function SystemSettingsPage() {
  const { employee } = useAuthStore();
  const updateEmployee = useUpdateEmployee();

  const [formData, setFormData] = useState({
    fullName: employee?.fullName || "",
    positionName: employee?.positionName || "",
    department: employee?.department || "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    setIsSaving(true);
    setMessage(null);

    try {
      await updateEmployee.mutateAsync({
        id: employee.id,
        input: {
          fullName: formData.fullName,
          positionName: formData.positionName || null,
          department: formData.department || null,
        },
      });

      setMessage({ type: "success", text: "정보가 저장되었습니다." });
    } catch (error) {
      console.error("Failed to update profile:", error);
      setMessage({ type: "error", text: "저장에 실패했습니다." });
    } finally {
      setIsSaving(false);
    }
  };

  if (!employee) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />내 계정 정보
          </CardTitle>
          <CardDescription>
            개인정보를 확인하고 수정할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 이메일 (읽기 전용) */}
            <div className="space-y-2">
              <Label>이메일 (수정불가)</Label>
              <Input value={employee.email} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">
                이메일 변경은 F1 관리자에게 요청하세요.
              </p>
            </div>

            {/* 이름 */}
            <div className="space-y-2">
              <Label htmlFor="fullName">이름 *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                required
              />
            </div>

            {/* 직책 */}
            <div className="space-y-2">
              <Label htmlFor="positionName">직책</Label>
              <Input
                id="positionName"
                value={formData.positionName}
                onChange={(e) =>
                  setFormData({ ...formData, positionName: e.target.value })
                }
                placeholder="예: 팀장, 사원"
              />
            </div>

            {/* 부서 */}
            <div className="space-y-2">
              <Label htmlFor="department">부서</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) =>
                  setFormData({ ...formData, department: e.target.value })
                }
                placeholder="예: 영업부, 마케팅부"
              />
            </div>

            {/* 보안 등급 (읽기 전용) */}
            <div className="space-y-2">
              <Label>보안 등급</Label>
              <Input
                value={employee.securityLevel}
                disabled
                className="bg-muted"
              />
            </div>

            {/* 저장 버튼 */}
            <div className="flex items-center gap-4 pt-4">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                저장
              </Button>

              {message && (
                <span
                  className={
                    message.type === "success"
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {message.text}
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
