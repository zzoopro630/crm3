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
import { useKeywords, useCreateKeyword, useDeleteKeyword } from "@/hooks/useKeywords";
import { useSites } from "@/hooks/useSites";
import { useCheckRankings } from "@/hooks/useRankings";
import { Plus, Trash2, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const keywordSchema = z.object({
  keyword: z.string().min(1, "키워드를 입력해주세요."),
  site_id: z.string().min(1, "사이트를 선택해주세요."),
});

export default function Keywords() {
  const [filterSiteId, setFilterSiteId] = useState(null);
  const { data: keywords, isLoading, refetch } = useKeywords(filterSiteId);
  const { data: sites } = useSites();
  const createKeyword = useCreateKeyword();
  const deleteKeyword = useDeleteKeyword();
  const checkRankings = useCheckRankings();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [checkingIds, setCheckingIds] = useState(new Set());

  const form = useForm({
    resolver: zodResolver(keywordSchema),
    defaultValues: { keyword: "", site_id: "" },
  });

  const handleCreate = async (data) => {
    try {
      await createKeyword.mutateAsync({
        keyword: data.keyword,
        site_id: parseInt(data.site_id),
      });
      toast.success("키워드가 등록되었습니다.");
      setIsCreateOpen(false);
      form.reset();
    } catch (error) {
      toast.error("키워드 등록에 실패했습니다.");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("정말 삭제하시겠습니까? 관련 랭킹 기록도 함께 삭제됩니다.")) return;
    try {
      await deleteKeyword.mutateAsync(id);
      toast.success("키워드가 삭제되었습니다.");
    } catch (error) {
      toast.error("키워드 삭제에 실패했습니다.");
    }
  };

  const handleCheckSingle = async (keywordId) => {
    setCheckingIds((prev) => new Set([...prev, keywordId]));

    try {
      await checkRankings.mutateAsync([keywordId]);
      toast.success("랭킹 체크가 완료되었습니다.");
      refetch();
    } catch (error) {
      toast.error("랭킹 체크 중 오류가 발생했습니다.");
    } finally {
      setCheckingIds((prev) => {
        const next = new Set(prev);
        next.delete(keywordId);
        return next;
      });
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
        <h1 className="text-3xl font-bold">키워드 관리</h1>
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
                <DialogDescription>랭킹을 체크할 키워드를 입력하세요.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="site">사이트</Label>
                  <Controller
                    name="site_id"
                    control={form.control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="사이트 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {sites?.map((site) => (
                            <SelectItem key={site.id} value={String(site.id)}>
                              {site.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.site_id && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.site_id.message}
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
                  {createKeyword.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                  추가
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-4">
        <Label>사이트 필터:</Label>
        <Select
          value={filterSiteId || "all"}
          onValueChange={(value) => setFilterSiteId(value === "all" ? null : value)}
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
          <CardDescription>랭킹 체크 대상 키워드 목록입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {keywords?.length > 0 ? (
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
                    <TableCell className="font-medium">{keyword.site_name}</TableCell>
                    <TableCell>{keyword.keyword}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={getRankBadgeVariant(keyword.latest_rank)}>
                        {keyword.latest_rank ? `${keyword.latest_rank}위` : "미확인"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(keyword.last_checked)}
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
              {sites?.length > 0
                ? "등록된 키워드가 없습니다. 키워드를 추가해주세요."
                : "먼저 사이트를 등록해주세요."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
