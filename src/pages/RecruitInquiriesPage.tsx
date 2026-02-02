import { useState, useMemo, useEffect } from "react";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuthStore } from "@/stores/authStore";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import {
  useRecruitInquiries,
  useUpdateRecruitInquiry,
} from "@/hooks/useRecruitInquiries";
import { CUSTOMER_STATUSES } from "@/types/customer";
import type { InquiryListParams } from "@/types/inquiry";

const PAGE_SIZE_OPTIONS = [15, 30, 50, 100];

const getSavedPageSize = () => {
  const saved = localStorage.getItem("recruitInquiries_pageSize");
  return saved ? parseInt(saved) : 15;
};

export default function RecruitInquiriesPage() {
  const { employee } = useAuthStore();
  const isAdmin =
    employee?.securityLevel === "F1" || employee?.securityLevel === "F2";
  const isF1 = employee?.securityLevel === "F1";

  const [pageSize, setPageSize] = useState(getSavedPageSize);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    status: "",
    managerId: "",
    search: "",
  });
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const activeFilterCount = [filters.status, filters.managerId].filter(
    Boolean
  ).length;

  const { data: employees } = useEmployees();
  const updateInquiry = useUpdateRecruitInquiry();

  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    return employees.filter((emp) => {
      if (!emp.isActive) return false;
      if (isF1) return true;
      return emp.organizationId === employee?.organizationId;
    });
  }, [employees, isF1, employee?.organizationId]);

  useEffect(() => {
    localStorage.setItem("recruitInquiries_pageSize", String(pageSize));
  }, [pageSize]);

  const queryParams = useMemo<InquiryListParams>(() => {
    const managedFilter =
      !isAdmin && employee?.id ? employee.id : filters.managerId || undefined;

    return {
      page: currentPage,
      limit: pageSize,
      search: filters.search || undefined,
      status: filters.status || undefined,
      managerId: managedFilter,
    };
  }, [currentPage, pageSize, filters, isAdmin, employee?.id]);

  const { data: response, isLoading } = useRecruitInquiries(queryParams);

  const list = response?.data || [];
  const totalCount = response?.total || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleAssign = async (
    inquiryId: number,
    managerId: string,
    selectEl: HTMLSelectElement
  ) => {
    if (!managerId) return;
    const prevValue = selectEl.dataset.prevValue || "";
    try {
      await updateInquiry.mutateAsync({
        id: inquiryId,
        input: { managerId },
      });
    } catch {
      selectEl.value = prevValue;
    }
  };

  const handleStatusChange = async (
    inquiryId: number,
    status: string,
    selectEl: HTMLSelectElement
  ) => {
    const prevValue = selectEl.dataset.prevValue || "";
    try {
      await updateInquiry.mutateAsync({
        id: inquiryId,
        input: { status },
      });
    } catch {
      selectEl.value = prevValue;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">입사문의</h1>
        <span className="text-sm text-muted-foreground">
          총 {totalCount}건
        </span>
      </div>

      {/* 필터 영역 */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="고객명, 연락처 검색..."
              value={filters.search}
              onChange={(e) => {
                setFilters((f) => ({ ...f, search: e.target.value }));
                setCurrentPage(1);
              }}
              className="pl-9"
            />
          </div>
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="lg:hidden flex items-center gap-1 px-3 py-2 text-sm border rounded-lg"
          >
            <Filter className="h-4 w-4" />
            필터
            {activeFilterCount > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <div
          className={`flex-wrap gap-2 ${showMobileFilters ? "flex" : "hidden lg:flex"}`}
        >
          {isAdmin && (
            <select
              value={filters.managerId}
              onChange={(e) => {
                setFilters((f) => ({ ...f, managerId: e.target.value }));
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-sm border rounded-lg bg-background"
            >
              <option value="">담당자 전체</option>
              {filteredEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName}
                </option>
              ))}
            </select>
          )}
          <select
            value={filters.status}
            onChange={(e) => {
              setFilters((f) => ({ ...f, status: e.target.value }));
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-sm border rounded-lg bg-background"
          >
            <option value="">상태 전체</option>
            {CUSTOMER_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 테이블 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          데이터가 없습니다.
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-3 py-3 text-left font-medium">고객명</th>
                <th className="px-3 py-3 text-left font-medium">연락처</th>
                <th className="px-3 py-3 text-left font-medium">상품명</th>
                <th className="px-3 py-3 text-left font-medium">캠페인</th>
                <th className="px-3 py-3 text-left font-medium">문의일</th>
                <th className="px-3 py-3 text-left font-medium">담당자</th>
                <th className="px-3 py-3 text-left font-medium">상태</th>
                <th className="px-3 py-3 text-left font-medium">메모</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {list.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30">
                  <td className="px-3 py-3 font-medium whitespace-nowrap">
                    {item.customerName}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {item.phone || "-"}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {item.productName || "-"}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {item.utmCampaign || "-"}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {formatDate(item.inquiryDate)}
                  </td>
                  <td className="px-3 py-3">
                    {isAdmin ? (
                      <select
                        value={item.managerId || ""}
                        data-prev-value={item.managerId || ""}
                        onChange={(e) =>
                          handleAssign(item.id, e.target.value, e.target)
                        }
                        className="px-2 py-1 text-xs border rounded bg-background w-20"
                      >
                        <option value="">미배정</option>
                        {filteredEmployees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.fullName}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs">
                        {item.managerName || "미배정"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <select
                      value={item.status}
                      data-prev-value={item.status}
                      onChange={(e) =>
                        handleStatusChange(item.id, e.target.value, e.target)
                      }
                      className="px-2 py-1 text-xs border rounded bg-background w-20"
                    >
                      {CUSTOMER_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3 max-w-[150px] truncate">
                    {item.memo || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 text-sm border rounded bg-background"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}건
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-2 rounded hover:bg-muted disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-sm">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={currentPage >= totalPages}
              className="p-2 rounded hover:bg-muted disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
