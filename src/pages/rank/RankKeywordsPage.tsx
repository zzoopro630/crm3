import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useRankKeywords,
  useRankSites,
  useCreateRankKeyword,
  useDeleteRankKeyword,
  useCheckRankings,
  useCreateRankSite,
  useUpdateRankSite,
  useDeleteRankSite,
} from "@/hooks/useRanking";
import type { RankSite } from "@/types/ranking";
import { Plus, Trash2, RefreshCw, Pencil, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const keywordSchema = z.object({
  keyword: z.string().min(1, "키워드를 입력해주세요."),
  siteId: z.string().min(1, "사이트를 선택해주세요."),
});

type KeywordFormData = z.infer<typeof keywordSchema>;

const siteSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요."),
  url: z.string().min(1, "URL을 입력해주세요."),
});

type SiteFormData = z.infer<typeof siteSchema>;

export default function RankKeywordsPage() {
  const [filterSiteId, setFilterSiteId] = useState<number | null>(null);
  const { data: keywords, isLoading, refetch } = useRankKeywords(filterSiteId);
  const { data: sites } = useRankSites();
  const createKeyword = useCreateRankKeyword();
  const deleteKeyword = useDeleteRankKeyword();
  const checkRankings = useCheckRankings();
  const createSite = useCreateRankSite();
  const updateSite = useUpdateRankSite();
  const deleteSite = useDeleteRankSite();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [checkingIds, setCheckingIds] = useState<Set<number>>(new Set());
  const [isCheckingAll, setIsCheckingAll] = useState(false);

  // 사이트 관리 다이얼로그
  const [isSiteCreateOpen, setIsSiteCreateOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<RankSite | null>(null);

  const form = useForm<KeywordFormData>({
    resolver: zodResolver(keywordSchema),
    defaultValues: { keyword: "", siteId: "" },
  });

  const siteCreateForm = useForm<SiteFormData>({
    resolver: zodResolver(siteSchema),
    defaultValues: { name: "", url: "" },
  });

  const siteEditForm = useForm<SiteFormData>({
    resolver: zodResolver(siteSchema),
    defaultValues: { name: "", url: "" },
  });

  const handleCreate = async (data: KeywordFormData) => {
    try {
      await createKeyword.mutateAsync({
        keyword: data.keyword,
        siteId: parseInt(data.siteId),
      });
      toast.success("키워드가 등록되었습니다.");
      setIsCreateOpen(false);
      form.reset();
    } catch {
      toast.error("키워드 등록에 실패했습니다.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까? 관련 랭킹 기록도 함께 삭제됩니다."))
      return;
    try {
      await deleteKeyword.mutateAsync(id);
      toast.success("키워드가 삭제되었습니다.");
    } catch {
      toast.error("키워드 삭제에 실패했습니다.");
    }
  };

  const handleCheckSingle = async (keywordId: number) => {
    setCheckingIds((prev) => new Set([...prev, keywordId]));
    try {
      await checkRankings.mutateAsync([keywordId]);
      toast.success("랭킹 체크가 완료되었습니다.");
      refetch();
    } catch {
      toast.error("랭킹 체크 중 오류가 발생했습니다.");
    } finally {
      setCheckingIds((prev) => {
        const next = new Set(prev);
        next.delete(keywordId);
        return next;
      });
    }
  };

  const handleCheckAll = async () => {
    if (!keywords?.length) return;
    setIsCheckingAll(true);
    const allIds = keywords.map((k) => k.id);
    setCheckingIds(new Set(allIds));
    try {
      await checkRankings.mutateAsync(allIds);
      toast.success("전체 랭킹 체크가 완료되었습니다.");
      refetch();
    } catch {
      toast.error("랭킹 체크 중 오류가 발생했습니다.");
    } finally {
      setCheckingIds(new Set());
      setIsCheckingAll(false);
    }
  };

  // 사이트 CRUD
  const handleSiteCreate = async (data: SiteFormData) => {
    try {
      await createSite.mutateAsync(data);
      toast.success("사이트가 등록되었습니다.");
      setIsSiteCreateOpen(false);
      siteCreateForm.reset();
    } catch {
      toast.error("사이트 등록에 실패했습니다.");
    }
  };

  const handleSiteEdit = async (data: SiteFormData) => {
    if (!editingSite) return;
    try {
      await updateSite.mutateAsync({ id: editingSite.id, ...data });
      toast.success("사이트가 수정되었습니다.");
      setEditingSite(null);
      siteEditForm.reset();
    } catch {
      toast.error("사이트 수정에 실패했습니다.");
    }
  };

  const handleSiteDelete = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까? 연결된 키워드와 랭킹 기록도 함께 삭제됩니다."))
      return;
    try {
      await deleteSite.mutateAsync(id);
      toast.success("사이트가 삭제되었습니다.");
    } catch {
      toast.error("사이트 삭제에 실패했습니다.");
    }
  };

  const openSiteEdit = (site: RankSite) => {
    setEditingSite(site);
    siteEditForm.reset({ name: site.name, url: site.url });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("ko-KR");
  };

  const getRankBadgeVariant = (rank: number | null | undefined): "default" | "secondary" | "outline" => {
    if (!rank) return "outline";
    if (rank <= 3) return "default";
    if (rank <= 10) return "secondary";
    return "outline";
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
      {/* 사이트 관리 섹션 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">사이트 관리</CardTitle>
            <CardDescription>랭킹 체크 대상 사이트 목록</CardDescription>
          </div>
          <Dialog open={isSiteCreateOpen} onOpenChange={setIsSiteCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                사이트 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={siteCreateForm.handleSubmit(handleSiteCreate)}>
                <DialogHeader>
                  <DialogTitle>사이트 추가</DialogTitle>
                  <DialogDescription>
                    랭킹을 체크할 사이트 정보를 입력하세요.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="create-site-name">사이트 이름</Label>
                    <Input
                      id="create-site-name"
                      placeholder="예: 내 블로그"
                      {...siteCreateForm.register("name")}
                    />
                    {siteCreateForm.formState.errors.name && (
                      <p className="text-sm text-destructive">
                        {siteCreateForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="create-site-url">URL</Label>
                    <Input
                      id="create-site-url"
                      placeholder="예: blog.naver.com/myblog"
                      {...siteCreateForm.register("url")}
                    />
                    {siteCreateForm.formState.errors.url && (
                      <p className="text-sm text-destructive">
                        {siteCreateForm.formState.errors.url.message}
                      </p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createSite.isPending}>
                    {createSite.isPending && (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    추가
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {sites?.length ? (
            <div className="flex flex-wrap gap-3">
              {sites.map((site) => (
                <div
                  key={site.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/50"
                >
                  <span className="font-medium text-sm">{site.name}</span>
                  <span className="text-xs text-muted-foreground">({site.url})</span>
                  <Badge variant="secondary" className="text-xs">
                    {site.keywordCount || 0}개
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6"
                    onClick={() => window.open(`https://${site.url}`, "_blank")}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6"
                    onClick={() => openSiteEdit(site)}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 text-destructive"
                    onClick={() => handleSiteDelete(site.id)}
                    disabled={deleteSite.isPending}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-muted-foreground">
              등록된 사이트가 없습니다. 사이트를 추가해주세요.
            </div>
          )}
        </CardContent>
      </Card>

      {/* 사이트 수정 다이얼로그 */}
      <Dialog
        open={!!editingSite}
        onOpenChange={(open) => !open && setEditingSite(null)}
      >
        <DialogContent>
          <form onSubmit={siteEditForm.handleSubmit(handleSiteEdit)}>
            <DialogHeader>
              <DialogTitle>사이트 수정</DialogTitle>
              <DialogDescription>사이트 정보를 수정하세요.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-site-name">사이트 이름</Label>
                <Input id="edit-site-name" {...siteEditForm.register("name")} />
                {siteEditForm.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {siteEditForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-site-url">URL</Label>
                <Input id="edit-site-url" {...siteEditForm.register("url")} />
                {siteEditForm.formState.errors.url && (
                  <p className="text-sm text-destructive">
                    {siteEditForm.formState.errors.url.message}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updateSite.isPending}>
                {updateSite.isPending && (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                )}
                저장
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 키워드 관리 섹션 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">키워드 관리</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleCheckAll}
            disabled={isCheckingAll || !keywords?.length}
          >
            {isCheckingAll && (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            )}
            전체 체크
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button disabled={!sites?.length}>
                <Plus className="w-4 h-4 mr-2" />
                키워드 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={form.handleSubmit(handleCreate)}>
                <DialogHeader>
                  <DialogTitle>키워드 추가</DialogTitle>
                  <DialogDescription>
                    랭킹을 체크할 키워드를 입력하세요.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="site">사이트</Label>
                    <Controller
                      name="siteId"
                      control={form.control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="사이트 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {sites?.map((site) => (
                              <SelectItem
                                key={site.id}
                                value={String(site.id)}
                              >
                                {site.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.siteId && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.siteId.message}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="keyword">키워드</Label>
                    <Input
                      id="keyword"
                      placeholder="예: 서울 맛집"
                      {...form.register("keyword")}
                    />
                    {form.formState.errors.keyword && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.keyword.message}
                      </p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createKeyword.isPending}>
                    {createKeyword.isPending && (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    추가
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-4">
        <Label>사이트 필터:</Label>
        <Select
          value={filterSiteId ? String(filterSiteId) : "all"}
          onValueChange={(value) =>
            setFilterSiteId(value === "all" ? null : parseInt(value))
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {sites?.map((site) => (
              <SelectItem key={site.id} value={String(site.id)}>
                {site.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>등록된 키워드</CardTitle>
          <CardDescription>
            랭킹 체크 대상 키워드 목록입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {keywords?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>사이트</TableHead>
                  <TableHead>키워드</TableHead>
                  <TableHead className="text-center">현재 순위</TableHead>
                  <TableHead>마지막 체크</TableHead>
                  <TableHead className="text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keywords.map((keyword) => (
                  <TableRow key={keyword.id}>
                    <TableCell className="font-medium">
                      {keyword.siteName}
                    </TableCell>
                    <TableCell>{keyword.keyword}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={getRankBadgeVariant(keyword.latestRank)}
                      >
                        {keyword.latestRank
                          ? `${keyword.latestRank}위`
                          : "미확인"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(keyword.lastChecked ?? null)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCheckSingle(keyword.id)}
                          disabled={checkingIds.has(keyword.id)}
                        >
                          {checkingIds.has(keyword.id) ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            "체크"
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(keyword.id)}
                          disabled={deleteKeyword.isPending}
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
              {sites?.length
                ? "등록된 키워드가 없습니다. 키워드를 추가해주세요."
                : "먼저 사이트를 등록해주세요."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
