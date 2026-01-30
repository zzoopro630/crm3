import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import {
  useTrashCustomers,
  usePermanentDeleteCustomer,
  useRestoreCustomer,
} from "@/hooks/useCustomers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2,
  Search,
  Trash2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

export default function TrashPage() {
  const { employee } = useAuthStore();
  const isAdmin =
    employee?.securityLevel === "F1" || employee?.securityLevel === "F2";

  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: response, isLoading } = useTrashCustomers({
    page,
    limit: 20,
    filters: { search: searchQuery || undefined },
  });

  const permanentDelete = usePermanentDeleteCustomer();
  const restore = useRestoreCustomer();

  const handleSearch = () => {
    setSearchQuery(searchTerm);
    setPage(1);
  };

  const handleRestore = async (id: number) => {
    if (window.confirm("이 고객을 복원하시겠습니까?")) {
      await restore.mutateAsync(id);
    }
  };

  const handlePermanentDelete = async (id: number) => {
    if (
      window.confirm(
        "이 고객을 완전히 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
      )
    ) {
      await permanentDelete.mutateAsync(id);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        접근 권한이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">휴지통</h1>
        <p className="text-muted-foreground">
          삭제된 고객을 복원하거나 완전히 삭제할 수 있습니다.
        </p>
      </div>

      {/* 검색 */}
      <div className="relative max-w-md">
        <button
          onClick={handleSearch}
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 hover:text-primary cursor-pointer"
        >
          <Search className="h-4 w-4" />
        </button>
        <Input
          placeholder="이름 또는 전화번호로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="pl-10 pr-10 bg-white dark:bg-zinc-900"
        />
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm("");
              setSearchQuery("");
              setPage(1);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 hover:text-zinc-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Card className="border-border bg-card rounded-xl shadow-lg">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-foreground">삭제된 고객</CardTitle>
          <CardDescription className="text-muted-foreground">
            총 {response?.total || 0}명
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !response?.data?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              휴지통이 비어있습니다.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        고객명
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        연락처
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        담당자
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        삭제일
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {response.data.map((customer: any) => (
                      <tr
                        key={customer.id}
                        className="border-b border-border hover:bg-secondary/20"
                      >
                        <td className="py-3 px-4 font-medium">
                          {customer.name}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {customer.phone || "-"}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {customer.managerName || "-"}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {customer.deletedAt
                            ? new Date(customer.deletedAt).toLocaleDateString(
                                "ko-KR"
                              )
                            : "-"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestore(customer.id)}
                              disabled={restore.isPending}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              복원
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                handlePermanentDelete(customer.id)
                              }
                              disabled={permanentDelete.isPending}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              완전삭제
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {response.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {page} / {response.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= response.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
