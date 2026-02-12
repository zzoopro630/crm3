import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  useTrackedUrls,
  useCreateTrackedUrl,
  useDeleteTrackedUrl,
  useCheckUrlRanking,
} from "@/hooks/useUrlTracking";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const SECTIONS = [
  { value: "all", label: "전체" },
  { value: "브랜드콘텐츠", label: "브랜드콘텐츠" },
  { value: "VIEW", label: "VIEW" },
  { value: "웹", label: "웹" },
  { value: "뉴스", label: "뉴스" },
  { value: "인플루언서", label: "인플루언서" },
];

const urlTrackingSchema = z.object({
  keyword: z.string().min(1, "키워드를 입력해주세요."),
  target_url: z.string().min(1, "대상 URL을 입력해주세요."),
  section: z.string().optional(),
  memo: z.string().optional(),
});

export default function UrlTracking() {
  const { data: trackedUrls, isLoading, refetch } = useTrackedUrls();
  const createTrackedUrl = useCreateTrackedUrl();
  const deleteTrackedUrl = useDeleteTrackedUrl();
  const checkUrlRanking = useCheckUrlRanking();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [checkingIds, setCheckingIds] = useState(new Set());
  const [isCheckingAll, setIsCheckingAll] = useState(false);

  const form = useForm({
    resolver: zodResolver(urlTrackingSchema),
    defaultValues: { keyword: "", target_url: "", section: "all", memo: "" },
  });

  const handleCreate = async (data) => {
    try {
      await createTrackedUrl.mutateAsync({
        keyword: data.keyword,
        target_url: data.target_url,
        section: data.section === "all" ? null : data.section,
        memo: data.memo || null,
      });
      toast.success("URL 추적이 등록되었습니다.");
      setIsCreateOpen(false);
      form.reset();
    } catch {
      toast.error("URL 추적 등록에 실패했습니다.");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("정말 삭제하시겠습니까? 관련 순위 기록도 함께 삭제됩니다.")) return;
    try {
      await deleteTrackedUrl.mutateAsync(id);
      toast.success("URL 추적이 삭제되었습니다.");
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  const handleCheckSingle = async (id) => {
    setCheckingIds((prev) => new Set([...prev, id]));
    try {
      await checkUrlRanking.mutateAsync([id]);
      toast.success("순위 체크가 완료되었습니다.");
      refetch();
    } catch {
      toast.error("순위 체크 중 오류가 발생했습니다.");
    } finally {
      setCheckingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleCheckAll = async () => {
    if (!trackedUrls?.length) return;
    setIsCheckingAll(true);
    const allIds = trackedUrls.map((t) => t.id);
    setCheckingIds(new Set(allIds));
    try {
      await checkUrlRanking.mutateAsync(allIds);
      toast.success("전체 순위 체크가 완료되었습니다.");
      refetch();
    } catch {
      toast.error("순위 체크 중 오류가 발생했습니다.");
    } finally {
      setCheckingIds(new Set());
      setIsCheckingAll(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("ko-KR");
  };

  const getRankBadgeVariant = (rank) => {
    if (!rank) return "outline";
    if (rank <= 3) return "default";
    if (rank <= 10) return "secondary";
    return "outline";
  };

  const truncateUrl = (url, maxLen = 40) => {
    if (!url) return "-";
    if (url.length <= maxLen) return url;
    return url.substring(0, maxLen) + "...";
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
        <h1 className="text-3xl font-bold">URL 추적</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleCheckAll}
            disabled={isCheckingAll || !trackedUrls?.length}
          >
            {isCheckingAll && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
            전체 체크
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                URL 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={form.handleSubmit(handleCreate)}>
                <DialogHeader>
                  <DialogTitle>URL 추적 추가</DialogTitle>
                  <DialogDescription>
                    네이버 통합 검색에서 노출 순위를 추적할 URL을 등록하세요.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="keyword">키워드</Label>
                    <Input
                      id="keyword"
                      placeholder="예: 다이어트 보조제"
                      {...form.register("keyword")}
                    />
                    {form.formState.errors.keyword && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.keyword.message}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="target_url">대상 URL</Label>
                    <Input
                      id="target_url"
                      placeholder="예: blog.naver.com/example/12345"
                      {...form.register("target_url")}
                    />
                    {form.formState.errors.target_url && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.target_url.message}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="section">영역</Label>
                    <Controller
                      name="section"
                      control={form.control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="전체" />
                          </SelectTrigger>
                          <SelectContent>
                            {SECTIONS.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="memo">메모</Label>
                    <Input
                      id="memo"
                      placeholder="메모 (선택사항)"
                      {...form.register("memo")}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createTrackedUrl.isPending}>
                    {createTrackedUrl.isPending && (
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

      <Card>
        <CardHeader>
          <CardTitle>추적 중인 URL</CardTitle>
          <CardDescription>
            네이버 통합 검색에서 특정 URL의 노출 순위를 추적합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trackedUrls?.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>키워드</TableHead>
                  <TableHead>대상 URL</TableHead>
                  <TableHead>영역</TableHead>
                  <TableHead className="text-center">전체 순위</TableHead>
                  <TableHead className="text-center">영역 내 순위</TableHead>
                  <TableHead>마지막 체크</TableHead>
                  <TableHead className="text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trackedUrls.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.keyword}</TableCell>
                    <TableCell
                      className="text-sm max-w-[200px] truncate"
                      title={item.target_url}
                    >
                      {truncateUrl(item.target_url)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.section || "전체"}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={getRankBadgeVariant(item.latest_rank)}>
                        {item.latest_rank ? `${item.latest_rank}위` : "미확인"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {item.latest_section_rank ? (
                        <span className="text-sm">
                          {item.latest_section} {item.latest_section_rank}위
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(item.last_checked)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCheckSingle(item.id)}
                          disabled={checkingIds.has(item.id)}
                        >
                          {checkingIds.has(item.id) ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            "체크"
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                          disabled={deleteTrackedUrl.isPending}
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
              등록된 URL이 없습니다. URL을 추가해주세요.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
