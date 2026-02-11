import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  useCustomers,
  useCreateCustomer,
  useDeleteCustomer,
} from "@/hooks/useCustomers";
import { useEmployees } from "@/hooks/useEmployees";
import { useSources } from "@/hooks/useSources";
import { useAuthStore } from "@/stores/authStore";
import { useIsEditor } from "@/hooks/useMenuRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  FileSpreadsheet,
  X,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ExcelUpload } from "@/components/customers/ExcelUpload";
import { AddressInput } from "@/components/customers/AddressInput";
import { BirthdateSelector } from "@/components/customers/BirthdateSelector";
import { ManagerSelector } from "@/components/customers/ManagerSelector";
import { StatusSelector } from "@/components/customers/StatusSelector";
import { SourceSelector } from "@/components/customers/SourceSelector";
import { BulkTransferModal } from "@/components/customers/BulkTransferModal";
import { CustomerCard } from "@/components/customers/CustomerCard";
import type {
  CreateCustomerInput,
  CustomerListParams,
  CustomerWithManager,
} from "@/types/customer";
import { CUSTOMER_STATUSES, GENDER_OPTIONS } from "@/types/customer";
import { cn } from "@/lib/utils";

// 전화번호 포맷팅 함수 (11자리 자유 입력, 자동 하이픈)
function formatPhoneNumber(value: string): string {
  // 숫자만 추출, 11자리 제한
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

// 이메일 검증
function isValidEmail(email: string): boolean {
  if (!email) return true; // optional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// 이름 검증 (한글, 영문, 숫자 포함 가능 - 업체명 허용)
function isValidName(name: string): { valid: boolean; message?: string } {
  if (!name.trim()) return { valid: false, message: "이름은 필수입니다" };
  if (name.length < 2)
    return { valid: false, message: "이름은 2자 이상이어야 합니다" };
  if (name.length > 50)
    return { valid: false, message: "이름은 50자 이하여야 합니다" };
  return { valid: true };
}

// 생년월일 검증 (yyyy-mm-dd, 연도 4자리만)
function isValidBirthdate(date: string): boolean {
  if (!date) return true; // optional
  const regex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  if (!regex.test(date)) return false;
  const year = parseInt(date.slice(0, 4));
  if (year < 1900 || year > new Date().getFullYear()) return false;
  return true;
}

export function CustomersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const managerFilter = searchParams.get("manager");

  const { employee } = useAuthStore();
  const isEditor = useIsEditor('/customers');
  const createCustomer = useCreateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const { data: allEmployees } = useEmployees();
  const { data: sources } = useSources();

  // F1~F4는 다른 사원에게 고객 배정 가능
  const canAssignToOthers =
    employee && ["F1", "F2", "F3", "F4"].includes(employee.securityLevel);
  const activeEmployees = allEmployees?.filter((emp) => emp.isActive) || [];

  // 모든 사용자는 기본적으로 자신의 고객만 볼 수 있음
  const isF5Only = employee?.securityLevel === "F5";
  const defaultManagerId = employee?.id;

  const [params, setParams] = useState<CustomerListParams>({
    page: 1,
    limit: 20,
    filters: {
      type: "personal",
      ...(defaultManagerId ? { managerId: defaultManagerId } : {}),
    },
  });

  // 정렬 상태
  const [sortConfig, setSortConfig] = useState<{
    key: keyof CustomerWithManager;
    direction: "asc" | "desc";
  }>({
    key: "createdAt",
    direction: "desc",
  });

  const handleSort = (key: keyof CustomerWithManager) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  // 검색어 로컬 상태
  const [searchTerm, setSearchTerm] = useState("");

  // 검색 실행 (버튼 클릭 또는 엔터)
  const handleSearch = () => {
    setParams((prev) => ({
      ...prev,
      page: 1,
      filters: { ...prev.filters, search: searchTerm || undefined },
    }));
  };

  // 검색어 초기화
  const handleClearSearch = () => {
    setSearchTerm("");
    setParams((prev) => ({
      ...prev,
      page: 1,
      filters: { ...prev.filters, search: undefined },
    }));
  };

  // URL의 manager 파라미터가 변경되면 params 업데이트
  useEffect(() => {
    if (isF5Only) {
      // F5 사용자는 항상 자신의 고객만 볼 수 있음
      setParams((prev) => ({
        ...prev,
        filters: { ...prev.filters, managerId: employee?.id },
      }));
    } else {
      // F1~F4: 담당자 필터가 있으면 해당 담당자, 없으면 자신의 고객
      setParams((prev) => ({
        ...prev,
        filters: { ...prev.filters, managerId: managerFilter || employee?.id },
      }));
    }
  }, [managerFilter, isF5Only, employee?.id]);

  // 담당자 필터 해제
  const clearManagerFilter = () => {
    setSearchParams({});
  };

  // 필터링된 담당자 이름 찾기
  const filteredManagerName = managerFilter
    ? allEmployees?.find((e) => e.id === managerFilter)?.fullName ||
      "알 수 없음"
    : null;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExcelUploadOpen, setIsExcelUploadOpen] = useState(false);
  const [isBulkTransferOpen, setIsBulkTransferOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(
    null
  );

  // 이관 권한 체크 (F5 이상만 가능)
  const canTransfer =
    employee && ["F1", "F2", "F3", "F4", "F5"].includes(employee.securityLevel);

  const [formData, setFormData] = useState<CreateCustomerInput>({
    name: "",
    phone: "",
    email: "",
    address: "",
    gender: "",
    birthdate: "",
    company: "",
    jobTitle: "",
    source: "",
    status: "new",
  });
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    phone?: string;
    email?: string;
    birthdate?: string;
  }>({});

  // onBlur 즉시 검증
  const handleBlurValidation = (field: "name" | "phone" | "email") => {
    const newErrors = { ...formErrors };

    if (field === "name") {
      const validation = isValidName(formData.name);
      newErrors.name = validation.valid ? undefined : validation.message;
    }

    if (field === "phone") {
      if (!formData.phone) {
        newErrors.phone = "전화번호를 입력하세요";
      } else if (!/^010-\d{4}-\d{4}$/.test(formData.phone)) {
        newErrors.phone = "올바른 전화번호 형식이 아닙니다 (010-0000-0000)";
      } else {
        newErrors.phone = undefined;
      }
    }

    if (field === "email") {
      if (formData.email && !isValidEmail(formData.email)) {
        newErrors.email = "올바른 이메일 형식이 아닙니다";
      } else {
        newErrors.email = undefined;
      }
    }

    setFormErrors(newErrors);
  };

  // 기간 필터 상태
  const [dateRange, setDateRange] = useState<
    "all" | "this_month" | "last_month"
  >("all");

  const { data: response, isLoading } = useCustomers(params);

  // 날짜 필터링 (클라이언트 사이드)
  const filteredByDate =
    response?.data?.filter((customer) => {
      if (dateRange === "all") return true;
      if (!customer.createdAt) return false;

      const created = new Date(customer.createdAt);
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      if (dateRange === "this_month") {
        return created >= thisMonthStart && created <= thisMonthEnd;
      }
      if (dateRange === "last_month") {
        return created >= lastMonthStart && created <= lastMonthEnd;
      }
      return true;
    }) || [];

  // 클라이언트 사이드 정렬 (날짜 필터링된 데이터 기준)
  const sortedData = filteredByDate.sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (!aValue && !bValue) return 0;
    if (!aValue) return 1;
    if (!bValue) return -1;

    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const handleStatusFilter = (status: string) => {
    setParams((prev) => ({
      ...prev,
      page: 1,
      filters: { ...prev.filters, status: status || undefined },
    }));
  };

  const handlePageChange = (newPage: number) => {
    setParams((prev) => ({ ...prev, page: newPage }));
    setSelectedIds([]); // 페이지 변경 시 선택 초기화
  };

  // 체크박스 핸들러
  const handleSelectAll = (checked: boolean) => {
    if (checked && response?.data) {
      setSelectedIds(response.data.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
    setLastSelectedIndex(null);
  };

  const handleSelectOne = (
    id: number,
    checked: boolean,
    index: number,
    event?: React.MouseEvent
  ) => {
    // Shift 키가 눌린 상태에서 클릭하면 범위 선택
    if (event?.shiftKey && lastSelectedIndex !== null && response?.data) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const rangeIds = response.data.slice(start, end + 1).map((c) => c.id);

      if (checked) {
        // 범위 내 모든 항목 선택
        setSelectedIds((prev) => [...new Set([...prev, ...rangeIds])]);
      } else {
        // 범위 내 모든 항목 선택 해제
        setSelectedIds((prev) => prev.filter((id) => !rangeIds.includes(id)));
      }
    } else {
      // 일반 클릭
      if (checked) {
        setSelectedIds((prev) => [...prev, id]);
      } else {
        setSelectedIds((prev) => prev.filter((i) => i !== id));
      }
    }
    setLastSelectedIndex(index);
  };

  const handleBulkTransferSuccess = () => {
    setSelectedIds([]);
  };

  const handleOpenSheet = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      address: "",
      gender: "",
      birthdate: "",
      company: "",
      jobTitle: "",
      source: "",
      status: "new",
    });
    setSelectedManagerId(employee?.id || "");
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    // Validation
    const errors: {
      name?: string;
      phone?: string;
      email?: string;
      birthdate?: string;
    } = {};

    // 이름 검증
    const nameValidation = isValidName(formData.name);
    if (!nameValidation.valid) {
      errors.name = nameValidation.message;
    }

    // 전화번호 검증
    if (!formData.phone) {
      errors.phone = "전화번호를 입력하세요";
    } else if (!/^010-\d{4}-\d{4}$/.test(formData.phone)) {
      errors.phone = "올바른 전화번호 형식이 아닙니다 (010-0000-0000)";
    }

    // 이메일 검증
    if (formData.email && !isValidEmail(formData.email)) {
      errors.email = "올바른 이메일 형식이 아닙니다";
    }

    // 생년월일 검증
    if (formData.birthdate && !isValidBirthdate(formData.birthdate)) {
      errors.birthdate = "올바른 날짜 형식이 아닙니다 (1900~현재년도)";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    try {
      await createCustomer.mutateAsync({
        input: formData,
        managerId: selectedManagerId || employee.id,
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Failed to create customer:", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("정말 이 고객을 삭제하시겠습니까?")) {
      try {
        await deleteCustomer.mutateAsync(id);
      } catch (error) {
        console.error("Failed to delete customer:", error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 검색 + 액션 버튼 */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 min-w-0">
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
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button variant="outline" className="shrink-0" onClick={() => setIsExcelUploadOpen(true)}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Excel 업로드
        </Button>
        <Button className="shrink-0" onClick={handleOpenSheet}>
          <Plus className="mr-2 h-4 w-4" />
          고객 등록
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
          {/* 기간 필터 */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="h-9 px-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm min-w-0"
          >
            <option value="all">전체 기간</option>
            <option value="this_month">당월</option>
            <option value="last_month">전월</option>
          </select>

          <select
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="h-9 px-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm min-w-0"
          >
            <option value="">전체 상태</option>
            {CUSTOMER_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>

          {/* 유입경로 필터 */}
          <select className="h-9 px-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm min-w-0">
            <option value="">전체 경로</option>
            {sources?.map((source) => (
              <option key={source.id} value={source.name}>
                {source.name}
              </option>
            ))}
          </select>
      </div>

      {/* Manager Filter Badge (F5 사용자에게는 숨김) */}
      {filteredManagerName && !isF5Only && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500">담당자 필터:</span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-sm font-medium">
            {filteredManagerName}
            <button
              onClick={clearManagerFilter}
              className="ml-1 hover:bg-emerald-500/20 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        </div>
      )}

      {/* Selection Action Bar */}
      {canTransfer && selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
          <span className="text-sm font-medium text-primary">
            {selectedIds.length}명 선택됨
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedIds([])}
            >
              선택 해제
            </Button>
            <Button size="sm" onClick={() => setIsBulkTransferOpen(true)}>
              <Users className="mr-2 h-4 w-4" />
              담당자 변경
            </Button>
          </div>
        </div>
      )}

      {/* Customer List */}
      <Card className="border-border bg-card rounded-xl shadow-lg">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-foreground">고객 목록</CardTitle>
          <CardDescription className="text-muted-foreground">
            총 {response?.total || 0}명
          </CardDescription>
        </CardHeader>
        <CardContent>
          {response?.data.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <p>등록된 고객이 없습니다</p>
              <p className="text-sm mt-1">고객을 등록하여 관리하세요</p>
            </div>
          ) : (
            <>
              {/* 모바일: 카드 레이아웃 */}
              <div className="block md:hidden space-y-3">
                {sortedData.map((customer) => (
                  <CustomerCard
                    key={customer.id}
                    customer={customer}
                    onDelete={handleDelete}
                    canTransfer={!!canTransfer}
                    isSelected={selectedIds.includes(customer.id)}
                    onSelect={(id, selected) =>
                      handleSelectOne(id, selected, 0, {} as React.MouseEvent)
                    }
                  />
                ))}
              </div>

              {/* 데스크톱: 테이블 레이아웃 */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      {canTransfer && (
                        <th className="w-12 py-4 px-4">
                          <input
                            type="checkbox"
                            checked={
                              response?.data &&
                              response.data.length > 0 &&
                              selectedIds.length === response.data.length
                            }
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
                          />
                        </th>
                      )}
                      <th
                        className="text-left py-4 px-4 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                        onClick={() => handleSort("name")}
                      >
                        이름{" "}
                        {sortConfig.key === "name" &&
                          (sortConfig.direction === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">
                        전화번호
                      </th>
                      <th
                        className="text-left py-4 px-4 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                        onClick={() => handleSort("source")}
                      >
                        유입경로{" "}
                        {sortConfig.key === "source" &&
                          (sortConfig.direction === "asc" ? "↑" : "↓")}
                      </th>
                      <th
                        className="text-left py-4 px-4 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                        onClick={() => handleSort("status")}
                      >
                        상태{" "}
                        {sortConfig.key === "status" &&
                          (sortConfig.direction === "asc" ? "↑" : "↓")}
                      </th>
                      <th
                        className="text-left py-4 px-4 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                        onClick={() => handleSort("managerName")}
                      >
                        담당자{" "}
                        {sortConfig.key === "managerName" &&
                          (sortConfig.direction === "asc" ? "↑" : "↓")}
                      </th>
                      <th
                        className="text-left py-4 px-4 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                        onClick={() => handleSort("createdAt")}
                      >
                        등록일{" "}
                        {sortConfig.key === "createdAt" &&
                          (sortConfig.direction === "asc" ? "↑" : "↓")}
                      </th>
                      {isEditor && (
                      <th className="text-right py-4 px-4 text-sm font-medium text-muted-foreground">
                        작업
                      </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.map((customer, index) => {
                      const isSelected = selectedIds.includes(customer.id);
                      return (
                        <tr
                          key={customer.id}
                          className={cn(
                            "border-b border-border transition-colors",
                            isSelected
                              ? "bg-primary/10 hover:bg-primary/15"
                              : "hover:bg-secondary/20"
                          )}
                        >
                          {canTransfer && (
                            <td className="w-12 py-4 px-4">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onClick={(e) =>
                                  handleSelectOne(
                                    customer.id,
                                    !isSelected,
                                    index,
                                    e
                                  )
                                }
                                onChange={() => {}}
                                className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary cursor-pointer"
                              />
                            </td>
                          )}
                          <td className="py-4 px-4 text-sm">
                            <Link
                              to={`/customers/${customer.id}`}
                              className="text-primary hover:underline font-medium"
                            >
                              {customer.name}
                            </Link>
                          </td>
                          <td className="py-4 px-4 text-sm text-muted-foreground">
                            {customer.phone || "-"}
                          </td>
                          <td className="py-4 px-4 text-sm">
                            <SourceSelector
                              customerId={customer.id}
                              currentSource={customer.source}
                            />
                          </td>
                          <td className="py-3 px-4">
                            <StatusSelector
                              customerId={customer.id}
                              currentStatus={customer.status}
                            />
                          </td>
                          <td className="py-4 px-4 text-sm">
                            <ManagerSelector
                              customerId={customer.id}
                              currentManagerId={customer.managerId}
                              currentManagerName={customer.managerName}
                            />
                          </td>
                          <td className="py-4 px-4 text-sm text-muted-foreground">
                            {customer.createdAt
                              ? new Date(customer.createdAt).toLocaleDateString(
                                  "ko-KR"
                                )
                              : "-"}
                          </td>
                          {isEditor && (
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(customer.id)}
                                className="h-8 w-8 text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {response && response.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(response.page - 1)}
                    disabled={response.page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {response.page} / {response.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(response.page + 1)}
                    disabled={response.page >= response.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Customer Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 max-w-lg max-h-[90vh] overflow-y-auto"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-white">
              고객 등록
            </DialogTitle>
            <DialogDescription>새로운 고객을 등록합니다</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                이름 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                onBlur={() => handleBlurValidation("name")}
                placeholder="홍길동 / ××주식회사"
                className={`bg-white dark:bg-zinc-800 ${
                  formErrors.name ? "border-red-500" : ""
                }`}
              />
              {formErrors.name && (
                <p className="text-sm text-red-500">{formErrors.name}</p>
              )}
            </div>
            {canAssignToOthers && (
              <div className="space-y-2">
                <Label htmlFor="manager">담당자</Label>
                <select
                  id="manager"
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                >
                  {activeEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} (
                      {emp.department || emp.positionName || emp.securityLevel})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-zinc-500">
                  다른 사원에게 고객을 배정할 수 있습니다
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="phone">
                전화번호 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    phone: formatPhoneNumber(e.target.value),
                  })
                }
                onBlur={() => handleBlurValidation("phone")}
                placeholder="010-0000-0000"
                maxLength={13}
                className={`bg-white dark:bg-zinc-800 ${
                  formErrors.phone ? "border-red-500" : ""
                }`}
              />
              {formErrors.phone && (
                <p className="text-sm text-red-500">{formErrors.phone}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                onBlur={() => handleBlurValidation("email")}
                placeholder="example@email.com"
                className={`bg-white dark:bg-zinc-800 ${
                  formErrors.email ? "border-red-500" : ""
                }`}
              />
              {formErrors.email && (
                <p className="text-xs text-red-500">{formErrors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">성별</Label>
              <select
                id="gender"
                value={formData.gender}
                onChange={(e) =>
                  setFormData({ ...formData, gender: e.target.value })
                }
                className="w-full h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
              >
                <option value="">선택</option>
                {GENDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <BirthdateSelector
              value={formData.birthdate || ""}
              onChange={(date) => setFormData({ ...formData, birthdate: date })}
              error={formErrors.birthdate}
            />
            <div className="space-y-2">
              <Label>주소</Label>
              <AddressInput
                value={formData.address || ""}
                onChange={(address: string) =>
                  setFormData({ ...formData, address })
                }
                placeholder="주소 검색"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">회사</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) =>
                  setFormData({ ...formData, company: e.target.value })
                }
                className="bg-white dark:bg-zinc-800"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobTitle">직급</Label>
              <Input
                id="jobTitle"
                value={formData.jobTitle}
                onChange={(e) =>
                  setFormData({ ...formData, jobTitle: e.target.value })
                }
                className="bg-white dark:bg-zinc-800"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">유입경로</Label>
              <select
                id="source"
                value={formData.source}
                onChange={(e) =>
                  setFormData({ ...formData, source: e.target.value })
                }
                className="w-full h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
              >
                <option value="">선택 안함</option>
                {sources?.map((source) => (
                  <option key={source.id} value={source.name}>
                    {source.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">상태</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                className="w-full h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
              >
                {CUSTOMER_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createCustomer.isPending}
              >
                {createCustomer.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                등록
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Excel Upload */}
      <ExcelUpload
        isOpen={isExcelUploadOpen}
        onClose={() => setIsExcelUploadOpen(false)}
      />

      {/* Bulk Transfer Modal */}
      <BulkTransferModal
        isOpen={isBulkTransferOpen}
        onClose={() => setIsBulkTransferOpen(false)}
        selectedIds={selectedIds}
        onSuccess={handleBulkTransferSuccess}
      />
    </div>
  );
}
