import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useEmployees } from "@/hooks/useEmployees";
import { useSources } from "@/hooks/useSources";
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
  MessageSquare,
} from "lucide-react";
import {
  updateCustomer,
  getCustomers,
  createCustomer,
} from "@/services/customers";
import { CustomerNotesModal } from "@/components/customers/CustomerNotesModal";
import type {
  CustomerWithManager,
  CreateCustomerInput,
} from "@/types/customer";
import { CUSTOMER_STATUSES } from "@/types/customer";
import { pad } from "kr-format";

// 폼 에러 타입
interface FormErrors {
  name?: string;
  phone?: string;
  interestProduct?: string;
}

// 이름 검증 함수 (한글/영문만, 최소 2글자)
const validateName = (name: string): string | undefined => {
  if (!name.trim()) return "고객명을 입력해주세요.";
  if (name.trim().length < 2) return "고객명은 최소 2글자 이상이어야 합니다.";
  // 한글, 영문, 공백만 허용
  const nameRegex = /^[가-힣a-zA-Z\s]+$/;
  if (!nameRegex.test(name.trim()))
    return "고객명은 한글 또는 영문만 입력 가능합니다.";
  return undefined;
};

// 전화번호 검증 함수 (8자리 숫자)
const validatePhone = (phoneDigits: string): string | undefined => {
  if (!phoneDigits) return "연락처를 입력해주세요.";
  const digits = phoneDigits.replace(/\D/g, "");
  if (digits.length !== 8) return "전화번호 8자리를 입력해주세요.";
  return undefined;
};

// 전화번호 포맷팅 함수 (8자리 → 010-XXXX-XXXX)
const formatPhoneForSave = (digits: string): string => {
  if (!digits || digits.length !== 8) return "";
  // 010 + 8자리를 kr-format으로 포맷팅
  const fullNumber = "010" + digits;
  try {
    return pad.phone(fullNumber);
  } catch {
    return `010-${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
};

// 탭 타입
type TabType = "inProgress" | "closed";

// 페이지 사이즈 옵션
const PAGE_SIZE_OPTIONS = [15, 30, 50, 100];

// 저장된 페이지 사이즈 가져오기
const getSavedPageSize = () => {
  const saved = localStorage.getItem("dbManagement_pageSize");
  return saved ? parseInt(saved) : 15;
};

export default function DbManagementPage() {
  const navigate = useNavigate();
  const { employee } = useAuthStore();
  const isAdmin =
    employee?.securityLevel === "F1" || employee?.securityLevel === "F2";
  const isF1 = employee?.securityLevel === "F1";

  // 탭 상태
  const [activeTab, setActiveTab] = useState<TabType>("inProgress");

  // DB 목록 상태
  const [dbList, setDbList] = useState<CustomerWithManager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageSize, setPageSize] = useState(getSavedPageSize);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // 필터 상태
  const [filters, setFilters] = useState({
    status: "",
    managerId: "",
    source: "",
    search: "",
  });
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // 활성화된 필터 개수 계산
  const activeFilterCount = [
    filters.status,
    filters.managerId,
    filters.source,
  ].filter(Boolean).length;

  // 모달 상태
  const [showAddModal, setShowAddModal] = useState(false);
  const [notesCustomerId, setNotesCustomerId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CreateCustomerInput>({
    name: "",
    phone: "",
    interestProduct: "",
    source: "",
    managerId: "",
    status: "new",
    type: "db",
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 이름 입력 핸들러 (실시간 검증)
  const handleNameChange = useCallback(
    (value: string) => {
      setFormData((prev) => ({ ...prev, name: value }));
      // 입력 중에는 빈 값 에러만 체크하지 않음 (blur 시 전체 검증)
      if (formErrors.name && value.trim()) {
        const error = validateName(value);
        setFormErrors((prev) => ({ ...prev, name: error }));
      }
    },
    [formErrors.name]
  );

  // 이름 blur 핸들러 (전체 검증)
  const handleNameBlur = useCallback(() => {
    const error = validateName(formData.name);
    setFormErrors((prev) => ({ ...prev, name: error }));
  }, [formData.name]);

  // 전화번호 입력 핸들러 (숫자 8자리만)
  const handlePhoneChange = useCallback(
    (value: string) => {
      // 숫자만 추출하고 8자리로 제한
      const digits = value.replace(/\D/g, "").slice(0, 8);
      setFormData((prev) => ({ ...prev, phone: digits }));
      // 입력 중에는 에러 클리어
      if (formErrors.phone && digits) {
        setFormErrors((prev) => ({ ...prev, phone: undefined }));
      }
    },
    [formErrors.phone]
  );

  // 전화번호 blur 핸들러 (전체 검증)
  const handlePhoneBlur = useCallback(() => {
    const error = validatePhone(formData.phone || "");
    setFormErrors((prev) => ({ ...prev, phone: error }));
  }, [formData.phone]);

  // 관심항목 blur 핸들러
  const handleInterestProductBlur = useCallback(() => {
    if (!formData.interestProduct?.trim()) {
      setFormErrors((prev) => ({
        ...prev,
        interestProduct: "관심항목을 입력해주세요.",
      }));
    } else {
      setFormErrors((prev) => ({ ...prev, interestProduct: undefined }));
    }
  }, [formData.interestProduct]);

  // 직원 목록 (배정용)
  const { data: employees } = useEmployees();
  const { data: sources } = useSources();

  // 담당자 필터용 직원 목록 (활성화된 직원만, F1은 전체, 그 외는 팀 소속만)
  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    return employees.filter((emp) => {
      // 비활성화 직원 제외
      if (!emp.isActive) return false;
      // F1 최고관리자는 모두 볼 수 있음
      if (isF1) return true;
      // 그 외는 같은 팀 소속만 (organizationId 같은 경우)
      return emp.organizationId === employee?.organizationId;
    });
  }, [employees, isF1, employee?.organizationId]);

  // 페이지 사이즈 저장
  useEffect(() => {
    localStorage.setItem("dbManagement_pageSize", String(pageSize));
  }, [pageSize]);

  // 데이터 가져오기 함수
  const fetchDbList = async (pageOverride?: number) => {
    const page = pageOverride ?? currentPage;
    setIsLoading(true);
    try {
      // F3~F5는 자기 배정 고객만 조회
      const managedFilter =
        !isAdmin && employee?.id ? { managerId: employee.id } : {};
      // 탭에 따른 상태 필터 설정
      let statusFilter = filters.status;
      if (activeTab === "closed") {
        statusFilter = "closed";
      } else if (activeTab === "inProgress" && !statusFilter) {
        statusFilter = "!closed";
      }

      const response = await getCustomers({
        page,
        limit: pageSize,
        filters: {
          ...filters,
          ...managedFilter,
          type: "db",
          status: statusFilter,
        },
      });

      setDbList(response.data);
      setTotalCount(response.total);
    } catch (error) {
      console.error("Failed to fetch DB list:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 탭 변경 시 페이지 리셋 및 데이터 fetch
  useEffect(() => {
    setCurrentPage(1);
    fetchDbList(1); // 명시적으로 page=1로 호출
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // 필터, 페이지 사이즈, 페이지 변경 시 데이터 fetch
  useEffect(() => {
    fetchDbList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pageSize, currentPage]);

  const handleAssign = async (customerId: number, managerId: string) => {
    try {
      await updateCustomer(customerId, { managerId });
      setDbList((prev) =>
        prev.map((item) =>
          item.id === customerId
            ? {
                ...item,
                managerId,
                managerName:
                  filteredEmployees?.find((e) => e.id === managerId)
                    ?.fullName || "",
              }
            : item
        )
      );
    } catch (error) {
      console.error("Failed to assign manager:", error);
      alert("담당자 배정에 실패했습니다.");
    }
  };

  // handleMemoSave 함수는 CustomerNotesModal이 대체하므로 제거

  const handleAdminCommentSave = async (
    customerId: number,
    adminComment: string
  ) => {
    if (!isAdmin) return;
    try {
      await updateCustomer(customerId, { adminComment });
      setDbList((prev) =>
        prev.map((item) =>
          item.id === customerId ? { ...item, adminComment } : item
        )
      );
    } catch (error) {
      console.error("Failed to save admin comment:", error);
    }
  };

  const handleInterestProductSave = async (
    customerId: number,
    interestProduct: string
  ) => {
    if (!isAdmin) return;
    try {
      await updateCustomer(customerId, { interestProduct });
      setDbList((prev) =>
        prev.map((item) =>
          item.id === customerId ? { ...item, interestProduct } : item
        )
      );
    } catch (error) {
      console.error("Failed to save interest product:", error);
    }
  };

  const handleSourceChange = async (customerId: number, source: string) => {
    if (!isAdmin) return;
    try {
      await updateCustomer(customerId, { source });
      setDbList((prev) =>
        prev.map((item) =>
          item.id === customerId ? { ...item, source } : item
        )
      );
    } catch (error) {
      console.error("Failed to save source:", error);
    }
  };

  const handleStatusChange = async (customerId: number, status: string) => {
    const customer = dbList.find((c) => c.id === customerId);
    if (!customer) return;
    if (!isAdmin && customer.managerId !== employee?.id) return;
    try {
      await updateCustomer(customerId, { status });
      // 상태 변경 시 탭에서 제거
      if (status === "closed" && activeTab === "inProgress") {
        setDbList((prev) => prev.filter((item) => item.id !== customerId));
      } else if (status !== "closed" && activeTab === "closed") {
        setDbList((prev) => prev.filter((item) => item.id !== customerId));
      } else {
        setDbList((prev) =>
          prev.map((item) =>
            item.id === customerId ? { ...item, status } : item
          )
        );
      }
    } catch (error) {
      console.error("Failed to save status:", error);
    }
  };

  const canEditMemo = (customer: CustomerWithManager) => {
    return isAdmin || customer.managerId === employee?.id;
  };

  const handleCustomerClick = (customerId: number) => {
    navigate(`/customers/${customerId}`);
  };

  const handleNotesClick = (customerId: number) => {
    setNotesCustomerId(customerId);
  };

  // DB 등록 핸들러
  const handleAddSubmit = async () => {
    // 전체 필드 검증
    const nameError = validateName(formData.name);
    const phoneError = validatePhone(formData.phone || "");
    const interestProductError = !formData.interestProduct?.trim()
      ? "관심항목을 입력해주세요."
      : undefined;

    const errors: FormErrors = {
      name: nameError,
      phone: phoneError,
      interestProduct: interestProductError,
    };

    setFormErrors(errors);

    // 에러가 있으면 중단
    if (nameError || phoneError || interestProductError) {
      return;
    }

    setIsSubmitting(true);
    try {
      // 전화번호를 010-XXXX-XXXX 형식으로 변환하여 저장
      const formattedPhone = formatPhoneForSave(formData.phone || "");
      await createCustomer({ ...formData, phone: formattedPhone });
      setShowAddModal(false);
      setFormData({
        name: "",
        phone: "",
        interestProduct: "",
        source: "",
        managerId: "",
        status: "new",
        type: "db",
      });
      setFormErrors({});
      fetchDbList();
    } catch (error) {
      console.error("Failed to create customer:", error);
      alert("등록에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 모달 닫기 핸들러 (폼 리셋 포함)
  const handleCloseModal = useCallback(() => {
    setShowAddModal(false);
    setFormData({
      name: "",
      phone: "",
      interestProduct: "",
      source: "",
      managerId: "",
      status: "new",
      type: "db",
    });
    setFormErrors({});
  }, []);

  // 총 페이지 수 계산
  const totalPages = Math.ceil(totalCount / pageSize);

  // F1~F5 모두 접근 가능 (isAdmin 체크 제거)

  // 모바일 카드 렌더링
  const renderMobileCard = (customer: CustomerWithManager) => (
    <div
      key={customer.id}
      className="bg-card border rounded-lg p-4 space-y-4 shadow-sm"
    >
      {/* 헤더: 고객명 + 상태 */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3
            className="font-semibold text-lg cursor-pointer hover:text-primary hover:underline mb-1"
            onClick={() => handleCustomerClick(customer.id)}
          >
            {customer.name}
          </h3>
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="text-sm text-primary flex items-center gap-1 hover:underline"
            >
              <Phone className="h-3 w-3" />
              {customer.phone}
            </a>
          )}
        </div>
        {canEditMemo(customer) ? (
          <select
            value={customer.status}
            onChange={(e) => handleStatusChange(customer.id, e.target.value)}
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
            {CUSTOMER_STATUSES.find((s) => s.value === customer.status)
              ?.label || customer.status}
          </span>
        )}
      </div>

      {/* 등록일 */}
      <div className="text-sm text-muted-foreground">
        등록일:{" "}
        {customer.createdAt
          ? new Date(customer.createdAt).toLocaleDateString()
          : "-"}
      </div>

      {/* 관심상품 */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          관심상품
        </label>
        {isAdmin ? (
          <Input
            defaultValue={customer.interestProduct || ""}
            onBlur={(e) => {
              if (e.target.value !== (customer.interestProduct || "")) {
                handleInterestProductSave(customer.id, e.target.value);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing)
                e.currentTarget.blur();
            }}
            className="h-9 text-sm"
            placeholder="관심상품..."
          />
        ) : (
          <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded border">
            {customer.interestProduct || "-"}
          </div>
        )}
      </div>

      {/* 담당자 */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <User className="h-3 w-3" />
          담당자
        </label>
        <select
          value={customer.managerId || ""}
          onChange={(e) => handleAssign(customer.id, e.target.value)}
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
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">
            메모
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleNotesClick(customer.id)}
            className="h-6 w-6 p-0 text-xs"
          >
            <MessageSquare className="h-3 w-3" />
          </Button>
        </div>
        <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded border min-h-[36px] flex items-center">
          {customer.memo || "메모 없음"}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-[1800px] mx-auto p-4 md:p-8 overflow-x-hidden">
      {/* 헤더 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">상담관리</h1>
          <p className="text-muted-foreground">
            상담 고객을 등록하고 영업 담당자에게 배분합니다.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
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
        {/* 검색 + 필터 토글 (모바일) / 검색 + 필터들 (데스크탑) */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* 검색창 */}
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

          {/* 모바일: 필터 토글 버튼 */}
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

        {/* 데스크탑: 인라인 필터들 */}
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

          {/* 유입경로 필터 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              유입경로
            </span>
            <select
              value={filters.source}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, source: e.target.value }))
              }
              className="h-9 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm min-w-[120px]"
            >
              <option value="">전체 유입경로</option>
              {sources?.map((src) => (
                <option key={src.id} value={src.name}>
                  {src.name}
                </option>
              ))}
            </select>
          </div>

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
            {/* 상태 필터 (진행중 탭만) */}
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

            {/* 유입경로 필터 */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                유입경로
              </label>
              <select
                value={filters.source}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, source: e.target.value }))
                }
                className="w-full h-9 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
              >
                <option value="">전체 유입경로</option>
                {sources?.map((src) => (
                  <option key={src.id} value={src.name}>
                    {src.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 담당자 필터 */}
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

            {/* 페이지 사이즈 */}
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
            ? "청약완료된 고객이 없습니다."
            : "등록된 상담 고객이 없습니다."}
        </div>
      )}

      {/* 모바일: 카드 레이아웃 */}
      {!isLoading && dbList.length > 0 && (
        <div className="md:hidden space-y-4">
          {dbList.map(renderMobileCard)}
        </div>
      )}

      {/* 데스크탑: 테이블 레이아웃 */}
      {!isLoading && dbList.length > 0 && (
        <div className="hidden md:block rounded-md border bg-card shadow-sm overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-2 py-3 font-medium w-[75px]">등록일</th>
                <th className="text-left px-2 py-3 font-medium w-[90px]">담당자</th>
                <th className="text-left px-2 py-3 font-medium w-[65px]">고객명</th>
                <th className="text-left px-2 py-3 font-medium w-[105px]">연락처</th>
                <th className="text-left px-2 py-3 font-medium w-[90px]">관심상품</th>
                {isAdmin && (
                  <th className="text-left px-2 py-3 font-medium w-[90px]">유입경로</th>
                )}
                <th className="text-left px-2 py-3 font-medium w-[90px]">상태</th>
                <th className="text-left px-2 py-3 font-medium">메모</th>
                <th className="text-left px-2 py-3 font-medium w-[150px]">관리자 코멘트</th>
              </tr>
            </thead>
            <tbody>
              {dbList.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b hover:bg-muted/40 odd:bg-muted/20"
                >
                  <td className="px-2 py-3 text-muted-foreground text-xs whitespace-nowrap">
                    {customer.createdAt
                      ? new Date(customer.createdAt).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-2 py-3">
                    <select
                      value={customer.managerId || ""}
                      onChange={(e) =>
                        handleAssign(customer.id, e.target.value)
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
                    <span
                      className="cursor-pointer hover:text-primary hover:underline"
                      onClick={() => handleCustomerClick(customer.id)}
                    >
                      {customer.name}
                    </span>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap">{customer.phone}</td>
                  <td className="px-2 py-3">
                    {isAdmin ? (
                      <Input
                        defaultValue={customer.interestProduct || ""}
                        onBlur={(e) => {
                          if (
                            e.target.value !== (customer.interestProduct || "")
                          ) {
                            handleInterestProductSave(
                              customer.id,
                              e.target.value
                            );
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.nativeEvent.isComposing)
                            e.currentTarget.blur();
                        }}
                        className="h-7 text-sm bg-transparent border-zinc-200 dark:border-zinc-700 w-full"
                        placeholder="관심상품..."
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {customer.interestProduct || "-"}
                      </span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-2 py-3">
                      <select
                        value={customer.source || ""}
                        onChange={(e) =>
                          handleSourceChange(customer.id, e.target.value)
                        }
                        className="h-7 px-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm w-full"
                      >
                        <option value="">선택</option>
                        {sources?.map((src) => (
                          <option key={src.id} value={src.name}>
                            {src.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                  <td className="px-2 py-3">
                    {canEditMemo(customer) ? (
                      <select
                        value={customer.status}
                        onChange={(e) =>
                          handleStatusChange(customer.id, e.target.value)
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
                          (s) => s.value === customer.status
                        )?.label || customer.status}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-1">
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-sm text-muted-foreground truncate"
                          title={customer.memo || ""}
                        >
                          {customer.memo || "-"}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleNotesClick(customer.id)}
                        className="h-6 w-6 p-0 shrink-0"
                        title="메모 보기"
                      >
                        <MessageSquare className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    {isAdmin ? (
                      <Input
                        defaultValue={customer.adminComment || ""}
                        onBlur={(e) => {
                          if (
                            e.target.value !== (customer.adminComment || "")
                          ) {
                            handleAdminCommentSave(customer.id, e.target.value);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.nativeEvent.isComposing)
                            e.currentTarget.blur();
                        }}
                        className="h-8 text-sm bg-transparent border-zinc-200 dark:border-zinc-700"
                        placeholder="코멘트..."
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {customer.adminComment || "-"}
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
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onBlur={handleNameBlur}
                  placeholder="고객명 입력 (한글/영문)"
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
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground whitespace-nowrap bg-muted px-3 py-2 rounded-l-md border border-r-0">
                    010-
                  </span>
                  <Input
                    id="phone"
                    value={formData.phone || ""}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    onBlur={handlePhoneBlur}
                    placeholder="12345678"
                    maxLength={8}
                    inputMode="numeric"
                    className={`flex-1 rounded-l-none ${
                      formErrors.phone
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                    }`}
                  />
                </div>
                {formErrors.phone && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.phone}
                  </p>
                )}
                <p className="text-muted-foreground text-xs mt-1">
                  숫자 8자리만 입력해주세요.
                </p>
              </div>
              <div>
                <Label htmlFor="interestProduct">
                  관심항목 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="interestProduct"
                  value={formData.interestProduct || ""}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      interestProduct: e.target.value,
                    }));
                    if (formErrors.interestProduct && e.target.value.trim()) {
                      setFormErrors((prev) => ({
                        ...prev,
                        interestProduct: undefined,
                      }));
                    }
                  }}
                  onBlur={handleInterestProductBlur}
                  placeholder="관심 상품/서비스"
                  className={
                    formErrors.interestProduct
                      ? "border-red-500 focus-visible:ring-red-500"
                      : ""
                  }
                />
                {formErrors.interestProduct && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.interestProduct}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="source">유입경로</Label>
                <select
                  id="source"
                  value={formData.source || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, source: e.target.value }))
                  }
                  className="w-full h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                >
                  <option value="">선택</option>
                  {sources?.map((src) => (
                    <option key={src.id} value={src.name}>
                      {src.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="manager">담당자</Label>
                <select
                  id="manager"
                  value={formData.managerId || ""}
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
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  등록
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 메모 상세보기 모달 */}
      {notesCustomerId && (
        <CustomerNotesModal
          customer={dbList.find((c) => c.id === notesCustomerId)!}
          isOpen={!!notesCustomerId}
          onClose={() => setNotesCustomerId(null)}
        />
      )}
    </div>
  );
}
