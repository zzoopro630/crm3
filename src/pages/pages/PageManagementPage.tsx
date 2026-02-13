import { useState } from "react";
import {
  usePages,
  useCreatePage,
  useUpdatePage,
  useDeletePage,
} from "@/hooks/usePages";
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
import { Loader2, Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import type { Page } from "@/types/page";
import RichTextEditor from "@/components/posts/RichTextEditor";

const ICON_OPTIONS = [
  { value: "FileText", label: "문서 (FileText)" },
  { value: "BookOpen", label: "책 (BookOpen)" },
  { value: "Newspaper", label: "뉴스 (Newspaper)" },
  { value: "ClipboardList", label: "체크리스트 (ClipboardList)" },
  { value: "HelpCircle", label: "도움말 (HelpCircle)" },
  { value: "Megaphone", label: "확성기 (Megaphone)" },
  { value: "FolderOpen", label: "폴더 (FolderOpen)" },
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

interface FormState {
  title: string;
  slug: string;
  content: string;
  icon: string;
  sortOrder: number;
  isPublished: boolean;
}

const INITIAL_FORM: FormState = {
  title: "",
  slug: "",
  content: "",
  icon: "FileText",
  sortOrder: 0,
  isPublished: false,
};

export default function PageManagementPage() {
  const { data: pages = [], isLoading } = usePages(true);
  const createPage = useCreatePage();
  const updatePage = useUpdatePage();
  const deletePage = useDeletePage();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Page | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Page | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(INITIAL_FORM);
    setDialogOpen(true);
  };

  const openEdit = (page: Page) => {
    setEditing(page);
    setForm({
      title: page.title,
      slug: page.slug,
      content: page.content,
      icon: page.icon || "FileText",
      sortOrder: page.sortOrder,
      isPublished: page.isPublished,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.slug.trim()) return;

    try {
      if (editing) {
        await updatePage.mutateAsync({
          id: editing.id,
          input: {
            title: form.title,
            slug: form.slug,
            content: form.content,
            icon: form.icon,
            sortOrder: form.sortOrder,
            isPublished: form.isPublished,
          },
        });
      } else {
        await createPage.mutateAsync({
          title: form.title,
          slug: form.slug,
          content: form.content,
          icon: form.icon,
          sortOrder: form.sortOrder,
          isPublished: form.isPublished,
        });
      }
      setDialogOpen(false);
    } catch { /* 글로벌 onError에서 toast 처리 */ }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePage.mutateAsync(deleteTarget.id);
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
          <h2 className="text-lg font-semibold">페이지 관리</h2>
          <p className="text-sm text-muted-foreground">
            정적 콘텐츠 페이지를 생성/수정/삭제합니다. 게시된 페이지는 사이드바에 표시됩니다.
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          페이지 추가
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left px-4 py-3 font-medium w-16">순서</th>
              <th className="text-left px-4 py-3 font-medium">제목</th>
              <th className="text-left px-4 py-3 font-medium">Slug</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">아이콘</th>
              <th className="text-center px-4 py-3 font-medium w-20">상태</th>
              <th className="text-center px-4 py-3 font-medium w-24">관리</th>
            </tr>
          </thead>
          <tbody>
            {pages.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted-foreground">
                  등록된 페이지가 없습니다.
                </td>
              </tr>
            ) : (
              pages.map((page) => (
                <tr key={page.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="px-4 py-3 text-muted-foreground">{page.sortOrder}</td>
                  <td className="px-4 py-3 font-medium">{page.title}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{page.slug}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{page.icon || "-"}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        page.isPublished
                          ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {page.isPublished ? (
                        <><Eye className="h-3 w-3" /> 게시</>
                      ) : (
                        <><EyeOff className="h-3 w-3" /> 미게시</>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(page)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => setDeleteTarget(page)}
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "페이지 수정" : "페이지 추가"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="page-title">제목</Label>
                <Input
                  id="page-title"
                  value={form.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      title,
                      ...(editing ? {} : { slug: toSlug(title) }),
                    }));
                  }}
                  placeholder="예: 보험 리드 신청"
                />
              </div>
              <div>
                <Label htmlFor="page-slug">Slug (URL 경로)</Label>
                <Input
                  id="page-slug"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  placeholder="예: lead-order"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  접속 경로: /page/{form.slug || "..."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
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
                <Label htmlFor="page-sort">정렬 순서</Label>
                <Input
                  id="page-sort"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, isPublished: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm">게시</span>
                </label>
              </div>
            </div>

            <div>
              <Label>내용</Label>
              <div className="mt-1">
                <RichTextEditor
                  key={editing?.id ?? "new"}
                  content={form.content}
                  onChange={(html) => setForm((prev) => ({ ...prev, content: html }))}
                  placeholder="페이지 내용을 입력하세요..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                취소
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  !form.title.trim() ||
                  !form.slug.trim() ||
                  createPage.isPending ||
                  updatePage.isPending
                }
              >
                {(createPage.isPending || updatePage.isPending) && (
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
            <AlertDialogTitle>페이지 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" 페이지를 삭제하시겠습니까?
              삭제된 페이지는 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {deletePage.isPending ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
