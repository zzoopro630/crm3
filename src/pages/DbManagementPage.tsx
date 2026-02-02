import { useState, useEffect, useMemo, useCallback } from "react";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuthStore } from "@/stores/authStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Search,
  User,
  Phone,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ChevronDown,
  Filter,
} from "lucide-react";
import { useInquiries, useUpdateInquiry, useCreateInquiry } from "@/hooks/useInquiries";
import { CUSTOMER_STATUSES } from "@/types/customer";
import type { Inquiry, InquiryListParams } from "@/types/inquiry";

// 폼 에러 타입
interface FormErrors {
  name?: string;
  phone?: string;
  productName?: string;
}

// 이름 검증 함수
const validateName = (name: string): string | undefined => {
  if (!name.trim()) return "고객명을 입력해주세요.";
  if (name.trim().length < 2) return "고객명은 최소 2글자 이상이어야 합니다.";
  return undefined;
};

// 전화번호 검증 함수
const validatePhone = (phone: string): string | undefined => {
  if (!phone) return "연락처를 입력해주세요.";
  if (!/^010-\d{4}-\d{4}$/.test(phone))
    return "올바른 전화번호 형식이 아닙니다 (010-0000-0000)";
  return undefined;
};

// 전화번호 포맷팅
const formatPhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
};

// 탭 타입
type TabType = "inProgress" | "closed";

// 페이지 사이즈 옵션
const PAGE_SIZE_OPTIONS = [15, 30, 50, 100];

const getSavedPageSize = () => {
  const saved = localStorage.getItem("dbManagement_pageSize");
  return saved ? parseInt(saved) : 15;
};

export default function DbManagementPage() {
  const { employee } = useAuthStore();
  const isAdmin =
    employee?.securityLevel === "F1" || employee?.securityLevel === "F2";
  const isF1 = employee?.securityLevel === "F1";

  const [activeTab, setActiveTab] = useState<TabType>("inProgress");
  const [pageSize, setPageSize] = useState(getSavedPageSize);
  const [currentPage, setCurrentPage] = useState(1);

  // 필터 상태
  const [filters, setFilters] = useState({
    status: "",
    managerId: "",
    search: "",
  });
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const activeFilterCount = [filters.status, filters.managerId].filter(
    Boolean
  ).length;

  // 모달 상태
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    customerName: "",
    phone: "",
    productName: "",
    managerId: "",
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const { data: employees } = useEmployees();
  const updateInquiry = useUpdateInquiry();
  const createInquiry = useCreateInquiry();

  // 담당자 필터용 직원 목록
  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    return employees.filter((emp) => {
      if (!emp.isActive) return false;
      if (isF1) return true;
      return emp.organizationId === employee?.organizationId;
    });
  }, [employees, isF1, employee?.organizationId]);

  // 페이지 사이즈 저장
  useEffect(() => {
    localStorage.setItem("dbManagement_pageSize", String(pageSize));
  }, [pageSize]);

  // API 파라미터 구성
  const queryParams = useMemo<InquiryListParams>(() => {
    const managedFilter =
      !isAdmin && employee?.id ? employee.id : filters.managerId || undefined;

    let statusFilter = filters.status;
    if (activeTab === "closed") {
      statusFilter = "closed";
    } else if (activeTab === "inProgress" && !statusFilter) {
      statusFilter = "!closed";
    }

    return {
      page: currentPage,
      limit: pageSize,
      search: filters.search || undefined,
      status: statusFilter || undefined,
      managerId: managedFilter,
    };
  }, [currentPage, pageSize, filters, activeTab, isAdmin, employee?.id]);

  const { data: response, isLoading } = useInquiries(queryParams);

  const dbList = response?.data || [];
  const totalCount = response?.total || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // 탭 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const handleAssign = async (inquiryId: number, managerId: string, selectEl: HTMLSelectElement) => {
    if (!managerId) return;

    const managerName = filteredEmployees.find((e) => e.id === managerId)?.fullName || "선택한 담당자";
    const inquiry = dbList.find((c) => c.id === inquiryId);
    const prevManagerId = inquiry?.managerId || "";

    if (!window.confirm(`"${managerName}"에게 배정하시겠습니까?`)) {
      selectEl.value = prevManagerId;
      return;
    }

    try {
      await updateInquiry.mutateAsync({
        id: inquiryId,
        input: { managerId },
      });
    } catch (error) {
      console.error("Failed to assign manager:", error);
      alert("담당자 배정에 실패했습니다.");
      selectEl.value = prevManagerId;
    }
  };

  const handleStatusChange = async (inquiryId: number, status: string) => {
    const inquiry = dbList.find((c) => c.id === inquiryId);
    if (!inquiry) return;
    if (!isAdmin && inquiry.managerId !== employee?.id) return;
    try {
      await updateInquiry.mutateAsync({
        id: inquiryId,
        input: { status },
      });
    } catch (error) {
      console.error("Failed to save status:", error);
    }
  };

  const handleMemoSave = async (inquiryId: number, memo: string) => {
    try {
      await updateInquiry.mutateAsync({
        id: inquiryId,
        input: { memo },
      });
    } catch (error) {
      console.error("Failed to save memo:", error);
    }
  };

  const canEditMemo = (inquiry: Inquiry) => {
    return isAdmin || inquiry.managerId === employee?.id;
  };

  // 이름 입력 핸들러
  const handleNameChange = useCallback(
    (value: string) => {
      setFormData((prev) => ({ ...prev, customerName: value }));
      if (formErrors.name && value.trim()) {
        const error = validateName(value);
        setFormErrors((prev) => ({ ...prev, name: error }));
      }
    },
    [formErrors.name]
  );

  const handleNameBlur = useCallback(() => {
    const error = validateName(formData.customerName);
    setFormErrors((prev) => ({ ...prev, name: error }));
  }, [formData.customerName]);

  const handlePhoneChange = useCallback(
    (value: string) => {
      const formatted = formatPhoneNumber(value);
      setFormData((prev) => ({ ...prev, phone: formatted }));
      if (formErrors.phone && formatted) {
        setFormErrors((prev) => ({ ...prev, phone: undefined }));
      }
    },
    [formErrors.phone]
  );

  const handlePhoneBlur = useCallback(() => {
    const error = validatePhone(formData.phone);
    setFormErrors((prev) => ({ ...prev, phone: error }));
  }, [formData.phone]);

  // 등록 핸들러
  const handleAddSubmit = async () => {
    const nameError = validateName(formData.customerName);
    const phoneError = validatePhone(formData.phone);

    const errors: FormErrors = { name: nameError, phone: phoneError };
    setFormErrors(errors);

    if (nameError || phoneError) return;

    try {
      await createInquiry.mutateAsync({
        customerName: formData.customerName,
        phone: formData.phone,
        productName: formData.productName || undefined,
        managerId: formData.managerId || undefined,
        status: "new",
      });
      setShowAddModal(false);
      setFormData({ customerName: "", phone: "", productName: "", managerId: "" });
      setFormErrors({});
    } catch (error) {
      console.error("Failed to create inquiry:", error);
      alert("등록에 실패했습니다.");
    }
  };

  const handleCloseModal = useCallback(() => {
    setShowAddModal(false);
    setFormData({ customerName: "", phone: "", productName: "", managerId: "" });
    setFormErrors({});
  }, []);

  // 모바일 카드 렌더링
  const renderMobileCard = (inquiry: Inquiry) => (
    <div
      key={inquiry.id}
      className="bg-card border rounded-lg p-4 space-y-4 shadow-sm"
    >
      {/* 헤더: 고객명 + 상태 */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">{inquiry.customerName}</h3>
          {inquiry.phone && (
            <a
              href={`tel:${inquiry.phone}`}
              className="text-sm text-primary flex items-center gap-1 hover:underline"
            >
              <Phone className="h-3 w-3" />
              {inquiry.phone}
            </a>
          )}
        </div>
        {canEditMemo(inquiry) ? (
          <select
            value={inquiry.status}
            onChange={(e) => handleStatusChange(inquiry.id, e.target.value)}
            className="h-8 px-2 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs min-w-[80px]"
          >
            {CUSTOMER_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="px-2 py-1 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800 min-w-[80px] text-center">
            {CUSTOMER_STATUSES.find((s) => s.value === inquiry.status)?.label ||
              inquiry.status}
          </span>
        )}
      </div>

      {/* 문의일 */}
      <div className="text-sm text-muted-foreground">
        문의일:{" "}
        {inquiry.inquiryDate
          ? new Date(inquiry.inquiryDate).toLocaleDateString()
          : "-"}
      </div>

      {/* 상품명 */}
      {inquiry.productName && (
        <div className="text-sm text-muted-foreground">
          상품: {inquiry.productName}
        </div>
      )}

      {/* 담당자 */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <User className="h-3 w-3" />
          담당자
        </label>
        <select
          value={inquiry.managerId || ""}
          onChange={(e) => handleAssign(inquiry.id, e.target.value, e.target)}
          className="w-full h-9 px-3 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
        >
          <option value="">담당자 선택</option>
          {filteredEmployees?.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.fullName}
            </option>
          ))}
        </select>
      </div>

      {/* 메모 */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          메모
        </label>
        {canEditMemo(inquiry) ? (
          <Input
            defaultValue={inquiry.memo || ""}
            onBlur={(e) => {
              if (e.target.value !== (inquiry.memo || "")) {
                handleMemoSave(inquiry.id, e.target.value);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing)
                e.currentTarget.blur();
            }}
            className="h-9 text-sm"
            placeholder="메모..."
          />
        ) : (
          <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded border min-h-[36px] flex items-center">
            {inquiry.memo || "메모 없음"}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-[1800px] mx-auto p-4 md:p-8 overflow-x-hidden">
      {/* 헤더 */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">상담관리</h1>
          <p className="text-sm text-muted-foreground">
            문의 고객을 확인하고 영업 담당자에게 배분합니다.
          </p>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            className="shrink-0"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="mr-1 h-4 w-4" />
            고객 등록
          </Button>
        )}
      </div>

      {/* 탭 */}
      <div className="bg-card p-1 rounded-lg border">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab("inProgress")}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === "inProgress"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            진행중
          </button>
          <button
            onClick={() => setActiveTab("closed")}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === "closed"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            청약완료
          </button>
        </div>
      </div>

      {/* 필터 영역 */}
      <div className="bg-card p-4 rounded-lg border shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="이름, 연락처 검색..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                className="pl-10"
              />
            </div>
          </div>

          {/* 모바일: 필터 토글 */}
          <Button
            variant="outline"
            size="sm"
            className="md:hidden shrink-0"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
          >
            <Filter className="h-4 w-4 mr-1" />
            필터
            {activeFilterCount > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground rounded-full px-1.5 text-xs">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown
              className={`h-4 w-4 ml-1 transition-transform ${
                showMobileFilters ? "rotate-180" : ""
              }`}
            />
          </Button>
        </div>

        {/* 데스크탑: 인라인 필터 */}
        <div className="hidden md:flex items-center gap-3 pt-2">
          <div className="h-6 w-px bg-border" />

          {/* 상태 필터 (진행중 탭만) */}
          {activeTab === "inProgress" && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                상태
              </span>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, status: e.target.value }))
                }
                className="h-9 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm min-w-[120px]"
              >
                <option value="">전체 상태</option>
                {CUSTOMER_STATUSES.filter((s) => s.value !== "closed").map(
                  (status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  )
                )}
              </select>
            </div>
          )}

          {/* 담당자 필터 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              담당자
            </span>
            <select
              value={filters.managerId}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, managerId: e.target.value }))
              }
              className="h-9 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm min-w-[120px]"
            >
              <option value="">전체 담당자</option>
              {filteredEmployees?.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* 페이지 사이즈 */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              표시
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-9 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}개
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 모바일: 펼쳐지는 필터 패널 */}
        {showMobileFilters && (
          <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t">
            {activeTab === "inProgress" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  상태
                </label>
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="w-full h-9 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
                >
                  <option value="">전체 상태</option>
                  {CUSTOMER_STATUSES.filter((s) => s.value !== "closed").map(
                    (status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    )
                  )}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                담당자
              </label>
              <select
                value={filters.managerId}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, managerId: e.target.value }))
                }
                className="w-full h-9 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
              >
                <option value="">전체 담당자</option>
                {filteredEmployees?.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                표시 개수
              </label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="w-full h-9 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}개
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 로딩 */}
      {isLoading && (
        <div className="flex justify-center items-center h-40 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          데이터를 불러오는 중...
        </div>
      )}

      {/* 빈 상태 */}
      {!isLoading && dbList.length === 0 && (
        <div className="flex justify-center items-center h-40 text-muted-foreground">
          {activeTab === "closed"
            ? "청약완료된 문의가 없습니다."
            : "등록된 문의가 없습니다."}
        </div>
      )}

      {/* 모바일: 카드 레이아웃 */}
      {!isLoading && dbList.length > 0 && (
        <div className="md:hidden space-y-4">{dbList.map(renderMobileCard)}</div>
      )}

      {/* 데스크탑: 테이블 레이아웃 */}
      {!isLoading && dbList.length > 0 && (
        <div className="hidden md:block rounded-md border bg-card shadow-sm overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-2 py-3 font-medium w-[75px]">
                  문의일
                </th>
                <th className="text-left px-2 py-3 font-medium w-[90px]">
                  담당자
                </th>
                <th className="text-left px-2 py-3 font-medium w-[65px]">
                  고객명
                </th>
                <th className="text-left px-2 py-3 font-medium w-[105px]">
                  연락처
                </th>
                <th className="text-left px-2 py-3 font-medium w-[120px]">
                  상품명
                </th>
                <th className="text-left px-2 py-3 font-medium w-[90px]">
                  상태
                </th>
                <th className="text-left px-2 py-3 font-medium">메모</th>
              </tr>
            </thead>
            <tbody>
              {dbList.map((inquiry) => (
                <tr
                  key={inquiry.id}
                  className="border-b hover:bg-muted/40 odd:bg-muted/20"
                >
                  <td className="px-2 py-3 text-muted-foreground text-xs whitespace-nowrap">
                    {inquiry.inquiryDate
                      ? new Date(inquiry.inquiryDate).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-2 py-3">
                    <select
                      value={inquiry.managerId || ""}
                      onChange={(e) =>
                        handleAssign(inquiry.id, e.target.value)
                      }
                      className="h-7 px-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm w-full"
                    >
                      <option value="">선택</option>
                      {filteredEmployees?.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.fullName}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-3 font-medium whitespace-nowrap">
                    {inquiry.customerName}
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap">
                    {inquiry.phone || "-"}
                  </td>
                  <td className="px-2 py-3 text-muted-foreground truncate">
                    {inquiry.productName || "-"}
                  </td>
                  <td className="px-2 py-3">
                    {canEditMemo(inquiry) ? (
                      <select
                        value={inquiry.status}
                        onChange={(e) =>
                          handleStatusChange(inquiry.id, e.target.value)
                        }
                        className="h-7 px-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm w-full"
                      >
                        {CUSTOMER_STATUSES.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800 whitespace-nowrap">
                        {CUSTOMER_STATUSES.find(
                          (s) => s.value === inquiry.status
                        )?.label || inquiry.status}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-3">
                    {canEditMemo(inquiry) ? (
                      <Input
                        defaultValue={inquiry.memo || ""}
                        onBlur={(e) => {
                          if (e.target.value !== (inquiry.memo || "")) {
                            handleMemoSave(inquiry.id, e.target.value);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.nativeEvent.isComposing)
                            e.currentTarget.blur();
                        }}
                        className="h-7 text-sm bg-transparent border-zinc-200 dark:border-zinc-700 w-full"
                        placeholder="메모..."
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {inquiry.memo || "-"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 페이지네이션 */}
      {!isLoading && totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </Button>
          <span className="text-sm text-muted-foreground px-4">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            다음
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* 등록 모달 */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-lg p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold">고객 등록</h3>
                <p className="text-sm text-muted-foreground">
                  새로운 상담 고객을 등록합니다
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleCloseModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">
                  고객명 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.customerName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onBlur={handleNameBlur}
                  placeholder="고객명 입력"
                  className={
                    formErrors.name
                      ? "border-red-500 focus-visible:ring-red-500"
                      : ""
                  }
                />
                {formErrors.name && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.name}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="phone">
                  연락처 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onBlur={handlePhoneBlur}
                  placeholder="010-0000-0000"
                  maxLength={13}
                  inputMode="numeric"
                  className={
                    formErrors.phone
                      ? "border-red-500 focus-visible:ring-red-500"
                      : ""
                  }
                />
                {formErrors.phone && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.phone}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="productName">상품명</Label>
                <Input
                  id="productName"
                  value={formData.productName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      productName: e.target.value,
                    }))
                  }
                  placeholder="관심 상품/서비스"
                />
              </div>
              <div>
                <Label htmlFor="manager">담당자</Label>
                <select
                  id="manager"
                  value={formData.managerId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      managerId: e.target.value,
                    }))
                  }
                  className="w-full h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                >
                  <option value="">선택</option>
                  {filteredEmployees?.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCloseModal}
                >
                  취소
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAddSubmit}
                  disabled={createInquiry.isPending}
                >
                  {createInquiry.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  등록
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
