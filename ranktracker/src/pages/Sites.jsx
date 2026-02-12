import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSites, useCreateSite, useUpdateSite, useDeleteSite } from "@/hooks/useSites";
import { Plus, Pencil, Trash2, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const siteSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요."),
  url: z.string().min(1, "URL을 입력해주세요."),
});

export default function Sites() {
  const { data: sites, isLoading, refetch } = useSites();
  const createSite = useCreateSite();
  const updateSite = useUpdateSite();
  const deleteSite = useDeleteSite();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSite, setEditingSite] = useState(null);

  const createForm = useForm({
    resolver: zodResolver(siteSchema),
    defaultValues: { name: "", url: "" },
  });

  const editForm = useForm({
    resolver: zodResolver(siteSchema),
    defaultValues: { name: "", url: "" },
  });

  const handleCreate = async (data) => {
    try {
      await createSite.mutateAsync(data);
      toast.success("사이트가 등록되었습니다.");
      setIsCreateOpen(false);
      createForm.reset();
    } catch (error) {
      toast.error("사이트 등록에 실패했습니다.");
    }
  };

  const handleEdit = async (data) => {
    try {
      await updateSite.mutateAsync({ id: editingSite.id, ...data });
      toast.success("사이트가 수정되었습니다.");
      setEditingSite(null);
      editForm.reset();
    } catch (error) {
      toast.error("사이트 수정에 실패했습니다.");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("정말 삭제하시겠습니까? 연결된 키워드와 랭킹 기록도 함께 삭제됩니다.")) return;
    try {
      await deleteSite.mutateAsync(id);
      toast.success("사이트가 삭제되었습니다.");
    } catch (error) {
      toast.error("사이트 삭제에 실패했습니다.");
    }
  };

  const openEdit = (site) => {
    setEditingSite(site);
    editForm.reset({ name: site.name, url: site.url });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("ko-KR");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">사이트 관리</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              사이트 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={createForm.handleSubmit(handleCreate)}>
              <DialogHeader>
                <DialogTitle>사이트 추가</DialogTitle>
                <DialogDescription>
                  랭킹을 체크할 사이트 정보를 입력하세요.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="create-name">사이트 이름</Label>
                  <Input
                    id="create-name"
                    placeholder="예: 내 블로그"
                    {...createForm.register("name")}
                  />
                  {createForm.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {createForm.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-url">URL</Label>
                  <Input
                    id="create-url"
                    placeholder="예: blog.naver.com/myblog"
                    {...createForm.register("url")}
                  />
                  {createForm.formState.errors.url && (
                    <p className="text-sm text-destructive">
                      {createForm.formState.errors.url.message}
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createSite.isPending}>
                  {createSite.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                  추가
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>등록된 사이트</CardTitle>
          <CardDescription>랭킹 체크 대상 사이트 목록입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {sites?.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead className="text-center">키워드 수</TableHead>
                  <TableHead>등록일</TableHead>
                  <TableHead className="text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map((site) => (
                  <TableRow key={site.id}>
                    <TableCell className="font-medium">{site.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{site.url}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6"
                          onClick={() => window.open(`https://${site.url}`, "_blank")}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{site.keyword_count || 0}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(site.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(site)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(site.id)}
                          disabled={deleteSite.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              등록된 사이트가 없습니다. 사이트를 추가해주세요.
            </div>
          )}
        </CardContent>
      </Card>

      {/* 수정 다이얼로그 */}
      <Dialog open={!!editingSite} onOpenChange={(open) => !open && setEditingSite(null)}>
        <DialogContent>
          <form onSubmit={editForm.handleSubmit(handleEdit)}>
            <DialogHeader>
              <DialogTitle>사이트 수정</DialogTitle>
              <DialogDescription>사이트 정보를 수정하세요.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">사이트 이름</Label>
                <Input id="edit-name" {...editForm.register("name")} />
                {editForm.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-url">URL</Label>
                <Input id="edit-url" {...editForm.register("url")} />
                {editForm.formState.errors.url && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.url.message}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updateSite.isPending}>
                {updateSite.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                저장
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
