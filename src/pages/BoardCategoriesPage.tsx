import { useState } from "react";
import {
  useBoardCategories,
  useCreateBoardCategory,
  useUpdateBoardCategory,
  useDeleteBoardCategory,
} from "@/hooks/useBoardCategories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import type { BoardCategory } from "@/types/boardCategory";

const ICON_OPTIONS = [
  { value: "Megaphone", label: "확성기 (Megaphone)" },
  { value: "FolderOpen", label: "폴더 (FolderOpen)" },
  { value: "FileText", label: "문서 (FileText)" },
  { value: "ClipboardList", label: "체크리스트 (ClipboardList)" },
  { value: "HelpCircle", label: "도움말 (HelpCircle)" },
  { value: "BookOpen", label: "책 (BookOpen)" },
  { value: "Newspaper", label: "뉴스 (Newspaper)" },
];

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[가-힣]+/g, (match) => match)
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function BoardCategoriesPage() {
  const { data: categories = [], isLoading } = useBoardCategories(false);
  const createCategory = useCreateBoardCategory();
  const updateCategory = useUpdateBoardCategory();
  const deleteCategory = useDeleteBoardCategory();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BoardCategory | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    icon: "FileText",
    sortOrder: 0,
    isActive: true,
  });

  const [deleteTarget, setDeleteTarget] = useState<BoardCategory | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", slug: "", icon: "FileText", sortOrder: 0, isActive: true });
    setDialogOpen(true);
  };

  const openEdit = (cat: BoardCategory) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon || "FileText",
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.slug.trim()) return;

    try {
      if (editing) {
        await updateCategory.mutateAsync({
          id: editing.id,
          input: {
            name: form.name,
            slug: form.slug,
            icon: form.icon,
            sortOrder: form.sortOrder,
            isActive: form.isActive,
          },
        });
      } else {
        await createCategory.mutateAsync({
          name: form.name,
          slug: form.slug,
          icon: form.icon,
          sortOrder: form.sortOrder,
        });
      }
      setDialogOpen(false);
    } catch { /* 글로벌 onError에서 toast 처리 */ }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCategory.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // 에러는 mutation에서 처리
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">게시판 관리</h2>
          <p className="text-sm text-muted-foreground">
            게시판 카테고리를 추가/수정/삭제합니다. 사이드바에 자동 반영됩니다.
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          카테고리 추가
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left px-4 py-3 font-medium w-16">순서</th>
              <th className="text-left px-4 py-3 font-medium">이름</th>
              <th className="text-left px-4 py-3 font-medium">Slug</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">아이콘</th>
              <th className="text-center px-4 py-3 font-medium w-20">상태</th>
              <th className="text-center px-4 py-3 font-medium w-24">관리</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted-foreground">
                  등록된 카테고리가 없습니다.
                </td>
              </tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="px-4 py-3 text-muted-foreground">{cat.sortOrder}</td>
                  <td className="px-4 py-3 font-medium">{cat.name}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{cat.slug}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{cat.icon || "-"}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        cat.isActive
                          ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {cat.isActive ? "활성" : "비활성"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(cat)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => setDeleteTarget(cat)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 추가/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "카테고리 수정" : "카테고리 추가"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cat-name">이름</Label>
              <Input
                id="cat-name"
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    name,
                    // 새로 생성 시에만 slug 자동 생성
                    ...(editing ? {} : { slug: toSlug(name) }),
                  }));
                }}
                placeholder="예: FAQ"
              />
            </div>
            <div>
              <Label htmlFor="cat-slug">Slug (URL 경로)</Label>
              <Input
                id="cat-slug"
                value={form.slug}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, slug: e.target.value }))
                }
                placeholder="예: faq"
              />
              <p className="text-xs text-muted-foreground mt-1">
                접속 경로: /board/{form.slug || "..."}
              </p>
            </div>
            <div>
              <Label>아이콘</Label>
              <Select
                value={form.icon}
                onValueChange={(v) => setForm((prev) => ({ ...prev, icon: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="cat-sort">정렬 순서</Label>
              <Input
                id="cat-sort"
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))
                }
              />
            </div>
            {editing && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="cat-active"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, isActive: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="cat-active" className="cursor-pointer">
                  활성 상태
                </Label>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                취소
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  !form.name.trim() ||
                  !form.slug.trim() ||
                  createCategory.isPending ||
                  updateCategory.isPending
                }
              >
                {(createCategory.isPending || updateCategory.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                )}
                {editing ? "수정" : "추가"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>카테고리 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" 카테고리를 삭제하시겠습니까?
              해당 카테고리에 게시글이 있으면 삭제할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {deleteCategory.isPending ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
