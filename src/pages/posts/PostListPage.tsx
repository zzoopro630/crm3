import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { usePosts, useCreatePost, useUpdatePost, useDeletePost } from "@/hooks/usePosts";
import { useBoardCategories } from "@/hooks/useBoardCategories";
import { useIsEditor } from "@/hooks/useMenuRole";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/posts/RichTextEditor";
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
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pin,
  Trash2,
  Pencil,
  X,
} from "lucide-react";
import type { CreatePostInput, UpdatePostInput, Post } from "@/types/post";

const PAGE_SIZE = 20;

export default function PostListPage() {
  const { slug } = useParams<{ slug: string }>();
  const category = slug || "";
  const basePath = `/board/${slug}`;

  const { data: categories = [] } = useBoardCategories();
  const categoryInfo = categories.find((c) => c.slug === slug);
  const categoryLabel = categoryInfo?.name || slug || "게시판";

  const isEditor = useIsEditor(`/board/${slug}`);

  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // 작성/수정 다이얼로그
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [form, setForm] = useState({
    title: "",
    content: "",
    isPinned: false,
    attachments: [] as { fileName: string; fileUrl: string }[],
  });

  // 삭제 확인
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading } = usePosts({
    category,
    search,
    page: currentPage,
    limit: PAGE_SIZE,
  });

  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const deletePost = useDeletePost();

  const posts = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSearch = () => {
    setSearch(searchInput);
    setCurrentPage(1);
  };

  const openCreateDialog = () => {
    setEditingPost(null);
    setForm({ title: "", content: "", isPinned: false, attachments: [] });
    setDialogOpen(true);
  };

  const openEditDialog = (post: Post) => {
    setEditingPost(post);
    setForm({
      title: post.title,
      content: post.content,
      isPinned: post.isPinned,
      attachments: post.attachments?.map((a) => ({
        fileName: a.fileName,
        fileUrl: a.fileUrl,
      })) || [],
    });
    setDialogOpen(true);
  };

  const isContentEmpty = (html: string) => {
    const text = html.replace(/<[^>]*>/g, "").trim();
    return text.length === 0 && !html.includes("<img");
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || isContentEmpty(form.content)) return;

    if (editingPost) {
      const input: UpdatePostInput = {
        title: form.title,
        content: form.content,
        isPinned: form.isPinned,
        attachments: form.attachments,
      };
      await updatePost.mutateAsync({ id: editingPost.id, input });
    } else {
      const input: CreatePostInput = {
        title: form.title,
        content: form.content,
        category,
        isPinned: form.isPinned,
        attachments: form.attachments,
      };
      await createPost.mutateAsync(input);
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    await deletePost.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const addAttachment = () => {
    setForm((prev) => ({
      ...prev,
      attachments: [...prev.attachments, { fileName: "", fileUrl: "" }],
    }));
  };

  const removeAttachment = (index: number) => {
    setForm((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  const updateAttachment = (
    index: number,
    field: "fileName" | "fileUrl",
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      attachments: prev.attachments.map((a, i) =>
        i === index ? { ...a, [field]: value } : a
      ),
    }));
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{categoryLabel}</h1>
        {isEditor && (
          <Button onClick={openCreateDialog} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            새 글 작성
          </Button>
        )}
      </div>

      {/* 검색 */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="제목 검색..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleSearch}>
          검색
        </Button>
      </div>

      {/* 목록 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          등록된 게시글이 없습니다.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-4 py-3 font-medium w-12">번호</th>
                <th className="text-left px-4 py-3 font-medium">제목</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell w-24">작성자</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell w-28">작성일</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell w-16">조회</th>
                {isEditor && (
                  <th className="text-center px-4 py-3 font-medium w-20">관리</th>
                )}
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr
                  key={post.id}
                  className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 text-muted-foreground">
                    {post.isPinned ? (
                      <Pin className="h-4 w-4 text-primary" />
                    ) : (
                      post.id
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`${basePath}/${post.id}`}
                      className="hover:text-primary transition-colors font-medium"
                    >
                      {post.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {post.authorName}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {new Date(post.createdAt).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {post.viewCount}
                  </td>
                  {isEditor && (
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEditDialog(post)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => setDeleteId(post.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* 작성/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {editingPost ? "게시글 수정" : "새 글 작성"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">제목</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="제목을 입력하세요"
              />
            </div>
            <div>
              <Label>내용</Label>
              <RichTextEditor
                content={form.content}
                onChange={(html) =>
                  setForm((prev) => ({ ...prev, content: html }))
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPinned"
                checked={form.isPinned}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, isPinned: e.target.checked }))
                }
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="isPinned" className="cursor-pointer">
                상단 고정
              </Label>
            </div>

            {/* 첨부링크 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>첨부 링크</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAttachment}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  추가
                </Button>
              </div>
              {form.attachments.map((att, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Input
                    placeholder="파일명"
                    value={att.fileName}
                    onChange={(e) =>
                      updateAttachment(i, "fileName", e.target.value)
                    }
                    className="flex-1"
                  />
                  <Input
                    placeholder="URL (Google Drive 등)"
                    value={att.fileUrl}
                    onChange={(e) =>
                      updateAttachment(i, "fileUrl", e.target.value)
                    }
                    className="flex-[2]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAttachment(i)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                취소
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  !form.title.trim() ||
                  isContentEmpty(form.content) ||
                  createPost.isPending ||
                  updatePost.isPending
                }
              >
                {(createPost.isPending || updatePost.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                )}
                {editingPost ? "수정" : "등록"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>게시글 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말 이 게시글을 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
