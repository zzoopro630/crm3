import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  FileSpreadsheet,
  Users,
  UserX,
} from "lucide-react";

interface Props {
  selectedCount: number;
  onEditSelected: () => void;
  onBulkDelete: () => void;
  isDeletePending: boolean;
  onExcelUpload: () => void;
  onAddEmployee: () => void;
  showInactive: boolean;
  setShowInactive: (v: boolean) => void;
  activeCount: number;
  inactiveCount: number;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
}

export function EmployeeToolbar({
  selectedCount,
  onEditSelected,
  onBulkDelete,
  isDeletePending,
  onExcelUpload,
  onAddEmployee,
  showInactive,
  setShowInactive,
  activeCount,
  inactiveCount,
  searchQuery,
  setSearchQuery,
}: Props) {
  return (
    <>
      {/* Actions */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          {selectedCount > 0 && (
            <>
              <Button variant="outline" onClick={onEditSelected}>
                <Pencil className="mr-2 h-4 w-4" />
                {selectedCount === 1 ? "수정" : `일괄 수정 (${selectedCount}명)`}
              </Button>
              <Button
                variant="outline"
                onClick={onBulkDelete}
                className="text-red-500 hover:text-red-600"
                disabled={isDeletePending}
              >
                {isDeletePending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                비활성화 ({selectedCount}명)
              </Button>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onExcelUpload}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel 업로드
          </Button>
          <Button onClick={onAddEmployee}>
            <Plus className="mr-2 h-4 w-4" />
            사원 등록
          </Button>
        </div>
      </div>

      {/* Active/Inactive tabs */}
      <div className="flex gap-2">
        <Button
          variant={!showInactive ? "default" : "outline"}
          onClick={() => setShowInactive(false)}
          className="gap-2"
        >
          <Users className="h-4 w-4" />
          활성 사원
          <span className="ml-1 text-xs bg-white/20 dark:bg-black/20 px-2 py-0.5 rounded-full">
            {activeCount}
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
            {inactiveCount}
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
    </>
  );
}
