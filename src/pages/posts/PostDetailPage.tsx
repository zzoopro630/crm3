import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePost, useUpdatePost, useDeletePost } from "@/hooks/usePosts";
import { useIsEditor } from "@/hooks/useMenuRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/posts/RichTextEditor";
import PostContentRenderer from "@/components/posts/PostContentRenderer";
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
  ArrowLeft,
  Pencil,
  Trash2,
  Pin,
  Paperclip,
  ExternalLink,
  Plus,
  X,
} from "lucide-react";
import type { UpdatePostInput } from "@/types/post";

export default function PostDetailPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const navigate = useNavigate();
  const isEditor = useIsEditor(`/board/${slug}`);

  const basePath = `/board/${slug}`;

  const postId = id ? parseInt(id) : null;
  const { data: post, isLoading } = usePost(postId);
  const updatePost = useUpdatePost();
  const deletePost = useDeletePost();

  // 수정 다이얼로그
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    content: "",
    isPinned: false,
    attachments: [] as { fileName: string; fileUrl: string }[],
  });

  // 삭제 확인
  const [deleteOpen, setDeleteOpen] = useState(false);

  const openEdit = () => {
    if (!post) return;
    setForm({
      title: post.title,
      content: post.content,
      isPinned: post.isPinned,
      attachments:
        post.attachments?.map((a) => ({
          fileName: a.fileName,
          fileUrl: a.fileUrl,
        })) || [],
    });
    setEditOpen(true);
  };

  const isContentEmpty = (html: string) => {
    const text = html.replace(/<[^>]*>/g, "").trim();
    return text.length === 0 && !html.includes("<img");
  };

  const handleUpdate = async () => {
    if (!post || !form.title.trim() || isContentEmpty(form.content)) return;
    const input: UpdatePostInput = {
      title: form.title,
      content: form.content,
      isPinned: form.isPinned,
      attachments: form.attachments,
    };
    await updatePost.mutateAsync({ id: post.id, input });
    setEditOpen(false);
  };

  const handleDelete = async () => {
    if (!post) return;
    await deletePost.mutateAsync(post.id);
    navigate(basePath);
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

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        게시글을 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(basePath)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          목록
        </Button>
        {isEditor && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={openEdit}>
              <Pencil className="h-4 w-4 mr-1" />
              수정
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              삭제
            </Button>
          </div>
        )}
      </div>

      {/* 게시글 */}
      <div className="border rounded-lg p-6 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {post.isPinned && (
              <Pin className="h-4 w-4 text-primary" />
            )}
            <h1 className="text-xl font-bold">{post.title}</h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{post.authorName}</span>
            <span>{new Date(post.createdAt).toLocaleDateString("ko-KR")}</span>
            <span>조회 {post.viewCount}</span>
          </div>
        </div>

        <hr />

        <div className="min-h-[200px]">
          <PostContentRenderer content={post.content} />
        </div>

        {/* 첨부파일 */}
        {post.attachments && post.attachments.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-1 mb-2 text-sm font-medium text-muted-foreground">
              <Paperclip className="h-4 w-4" />
              첨부파일 ({post.attachments.length})
            </div>
            <div className="space-y-1">
              {post.attachments.map((att) => (
                <a
                  key={att.id}
                  href={att.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {att.fileName}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 수정 다이얼로그 */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>게시글 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">제목</Label>
              <Input
                id="edit-title"
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
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
                id="edit-isPinned"
                checked={form.isPinned}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, isPinned: e.target.checked }))
                }
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="edit-isPinned" className="cursor-pointer">
                상단 고정
              </Label>
            </div>

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
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                취소
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={
                  !form.title.trim() ||
                  isContentEmpty(form.content) ||
                  updatePost.isPending
                }
              >
                {updatePost.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                )}
                수정
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
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
