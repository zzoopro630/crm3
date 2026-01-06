import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEmployees } from '@/hooks/useEmployees'
import { useSources } from '@/hooks/useSources'
import { useAuthStore } from '@/stores/authStore'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2, Search, Database, User, Phone, X, Plus, ChevronLeft, ChevronRight, AlertCircle, ChevronDown, Filter } from 'lucide-react'
import { updateCustomer, getCustomers, createCustomer } from '@/services/customers'
import type { CustomerWithManager, CreateCustomerInput } from '@/types/customer'
import { CUSTOMER_STATUSES } from '@/types/customer'
import { pad } from 'kr-format'

// 폼 에러 타입
interface FormErrors {
    name?: string
    phone?: string
    interestProduct?: string
}

// 이름 검증 함수 (한글/영문만, 최소 2글자)
const validateName = (name: string): string | undefined => {
    if (!name.trim()) return '고객명을 입력해주세요.'
    if (name.trim().length < 2) return '고객명은 최소 2글자 이상이어야 합니다.'
    // 한글, 영문, 공백만 허용
    const nameRegex = /^[가-힣a-zA-Z\s]+$/
    if (!nameRegex.test(name.trim())) return '고객명은 한글 또는 영문만 입력 가능합니다.'
    return undefined
}

// 전화번호 검증 함수 (8자리 숫자)
const validatePhone = (phoneDigits: string): string | undefined => {
    if (!phoneDigits) return '연락처를 입력해주세요.'
    const digits = phoneDigits.replace(/\D/g, '')
    if (digits.length !== 8) return '전화번호 8자리를 입력해주세요.'
    return undefined
}

// 전화번호 포맷팅 함수 (8자리 → 010-XXXX-XXXX)
const formatPhoneForSave = (digits: string): string => {
    if (!digits || digits.length !== 8) return ''
    // 010 + 8자리를 kr-format으로 포맷팅
    const fullNumber = '010' + digits
    try {
        return pad.phone(fullNumber)
    } catch {
        return `010-${digits.slice(0, 4)}-${digits.slice(4)}`
    }
}

// 탭 타입
type TabType = 'inProgress' | 'closed'

// 페이지 사이즈 옵션
const PAGE_SIZE_OPTIONS = [15, 30, 50, 100]

// 저장된 페이지 사이즈 가져오기
const getSavedPageSize = () => {
    const saved = localStorage.getItem('dbManagement_pageSize')
    return saved ? parseInt(saved) : 15
}

export default function DbManagementPage() {
    const navigate = useNavigate()
    const { employee } = useAuthStore()
    const isAdmin = employee?.securityLevel === 'F1' || employee?.securityLevel === 'F2'
    const isF1 = employee?.securityLevel === 'F1'

    // 탭 상태
    const [activeTab, setActiveTab] = useState<TabType>('inProgress')

    // DB 목록 상태
    const [dbList, setDbList] = useState<CustomerWithManager[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [pageSize, setPageSize] = useState(getSavedPageSize)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)

    // 필터 상태
    const [filters, setFilters] = useState({
        status: '',
        managerId: '',
        source: '',
        search: '',
    })
    const [showMobileFilters, setShowMobileFilters] = useState(false)

    // 활성화된 필터 개수 계산
    const activeFilterCount = [
        filters.status,
        filters.managerId,
        filters.source,
    ].filter(Boolean).length

    // 등록 모달 상태
    const [showAddModal, setShowAddModal] = useState(false)
    const [formData, setFormData] = useState<CreateCustomerInput>({
        name: '',
        phone: '',
        interestProduct: '',
        source: '',
        managerId: '',
        status: 'new',
        type: 'db',
    })
    const [formErrors, setFormErrors] = useState<FormErrors>({})
    const [isSubmitting, setIsSubmitting] = useState(false)

    // 이름 입력 핸들러 (실시간 검증)
    const handleNameChange = useCallback((value: string) => {
        setFormData(prev => ({ ...prev, name: value }))
        // 입력 중에는 빈 값 에러만 체크하지 않음 (blur 시 전체 검증)
        if (formErrors.name && value.trim()) {
            const error = validateName(value)
            setFormErrors(prev => ({ ...prev, name: error }))
        }
    }, [formErrors.name])

    // 이름 blur 핸들러 (전체 검증)
    const handleNameBlur = useCallback(() => {
        const error = validateName(formData.name)
        setFormErrors(prev => ({ ...prev, name: error }))
    }, [formData.name])

    // 전화번호 입력 핸들러 (숫자 8자리만)
    const handlePhoneChange = useCallback((value: string) => {
        // 숫자만 추출하고 8자리로 제한
        const digits = value.replace(/\D/g, '').slice(0, 8)
        setFormData(prev => ({ ...prev, phone: digits }))
        // 입력 중에는 에러 클리어
        if (formErrors.phone && digits) {
            setFormErrors(prev => ({ ...prev, phone: undefined }))
        }
    }, [formErrors.phone])

    // 전화번호 blur 핸들러 (전체 검증)
    const handlePhoneBlur = useCallback(() => {
        const error = validatePhone(formData.phone || '')
        setFormErrors(prev => ({ ...prev, phone: error }))
    }, [formData.phone])

    // 관심항목 blur 핸들러
    const handleInterestProductBlur = useCallback(() => {
        if (!formData.interestProduct?.trim()) {
            setFormErrors(prev => ({ ...prev, interestProduct: '관심항목을 입력해주세요.' }))
        } else {
            setFormErrors(prev => ({ ...prev, interestProduct: undefined }))
        }
    }, [formData.interestProduct])

    // 직원 목록 (배정용)
    const { data: employees } = useEmployees()
    const { data: sources } = useSources()

    // 담당자 필터용 직원 목록 (활성화된 직원만, F1은 전체, 그 외는 팀 소속만)
    const filteredEmployees = useMemo(() => {
        if (!employees) return []
        return employees.filter(emp => {
            // 비활성화 직원 제외
            if (!emp.isActive) return false
            // F1 최고관리자는 모두 볼 수 있음
            if (isF1) return true
            // 그 외는 같은 팀 소속만 (organizationId 같은 경우)
            return emp.organizationId === employee?.organizationId
        })
    }, [employees, isF1, employee?.organizationId])

    // 페이지 사이즈 저장
    useEffect(() => {
        localStorage.setItem('dbManagement_pageSize', String(pageSize))
    }, [pageSize])

    // 탭 변경 시 페이지 리셋
    useEffect(() => {
        setCurrentPage(1)
    }, [activeTab])

    // 데이터 가져오기
    useEffect(() => {
        fetchDbList()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters, pageSize, currentPage, activeTab])

    const fetchDbList = async () => {
        setIsLoading(true)
        try {
            const response = await getCustomers({
                page: currentPage,
                limit: pageSize,
                filters: {
                    ...filters,
                    type: 'db',
                }
            })

            // 탭에 따라 필터링
            const filteredData = activeTab === 'inProgress'
                ? response.data.filter(c => c.status !== 'closed')
                : response.data.filter(c => c.status === 'closed')

            setDbList(filteredData)
            setTotalCount(response.total)
        } catch (error) {
            console.error('Failed to fetch DB list:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleAssign = async (customerId: number, managerId: string) => {
        try {
            await updateCustomer(customerId, { managerId })
            setDbList(prev => prev.map(item =>
                item.id === customerId
                    ? { ...item, managerId, managerName: filteredEmployees?.find(e => e.id === managerId)?.fullName || '' }
                    : item
            ))
        } catch (error) {
            console.error('Failed to assign manager:', error)
            alert('담당자 배정에 실패했습니다.')
        }
    }

    const handleMemoSave = async (customerId: number, memo: string) => {
        try {
            await updateCustomer(customerId, { memo })
            setDbList(prev => prev.map(item =>
                item.id === customerId ? { ...item, memo } : item
            ))
        } catch (error) {
            console.error('Failed to save memo:', error)
        }
    }

    const handleAdminCommentSave = async (customerId: number, adminComment: string) => {
        if (!isAdmin) return
        try {
            await updateCustomer(customerId, { adminComment })
            setDbList(prev => prev.map(item =>
                item.id === customerId ? { ...item, adminComment } : item
            ))
        } catch (error) {
            console.error('Failed to save admin comment:', error)
        }
    }

    const handleInterestProductSave = async (customerId: number, interestProduct: string) => {
        if (!isAdmin) return
        try {
            await updateCustomer(customerId, { interestProduct })
            setDbList(prev => prev.map(item =>
                item.id === customerId ? { ...item, interestProduct } : item
            ))
        } catch (error) {
            console.error('Failed to save interest product:', error)
        }
    }

    const handleSourceChange = async (customerId: number, source: string) => {
        if (!isAdmin) return
        try {
            await updateCustomer(customerId, { source })
            setDbList(prev => prev.map(item =>
                item.id === customerId ? { ...item, source } : item
            ))
        } catch (error) {
            console.error('Failed to save source:', error)
        }
    }

    const handleStatusChange = async (customerId: number, status: string) => {
        const customer = dbList.find(c => c.id === customerId)
        if (!customer) return
        if (!isAdmin && customer.managerId !== employee?.id) return
        try {
            await updateCustomer(customerId, { status })
            // 상태 변경 시 탭에서 제거
            if (status === 'closed' && activeTab === 'inProgress') {
                setDbList(prev => prev.filter(item => item.id !== customerId))
            } else if (status !== 'closed' && activeTab === 'closed') {
                setDbList(prev => prev.filter(item => item.id !== customerId))
            } else {
                setDbList(prev => prev.map(item =>
                    item.id === customerId ? { ...item, status } : item
                ))
            }
        } catch (error) {
            console.error('Failed to save status:', error)
        }
    }

    const canEditMemo = (customer: CustomerWithManager) => {
        return isAdmin || customer.managerId === employee?.id
    }

    const handleCustomerClick = (customerId: number) => {
        navigate(`/customers/${customerId}`)
    }

    // DB 등록 핸들러
    const handleAddSubmit = async () => {
        // 전체 필드 검증
        const nameError = validateName(formData.name)
        const phoneError = validatePhone(formData.phone || '')
        const interestProductError = !formData.interestProduct?.trim()
            ? '관심항목을 입력해주세요.'
            : undefined

        const errors: FormErrors = {
            name: nameError,
            phone: phoneError,
            interestProduct: interestProductError,
        }

        setFormErrors(errors)

        // 에러가 있으면 중단
        if (nameError || phoneError || interestProductError) {
            return
        }

        setIsSubmitting(true)
        try {
            // 전화번호를 010-XXXX-XXXX 형식으로 변환하여 저장
            const formattedPhone = formatPhoneForSave(formData.phone || '')
            await createCustomer({ ...formData, phone: formattedPhone })
            setShowAddModal(false)
            setFormData({
                name: '',
                phone: '',
                interestProduct: '',
                source: '',
                managerId: '',
                status: 'new',
                type: 'db',
            })
            setFormErrors({})
            fetchDbList()
        } catch (error) {
            console.error('Failed to create customer:', error)
            alert('등록에 실패했습니다.')
        } finally {
            setIsSubmitting(false)
        }
    }

    // 모달 닫기 핸들러 (폼 리셋 포함)
    const handleCloseModal = useCallback(() => {
        setShowAddModal(false)
        setFormData({
            name: '',
            phone: '',
            interestProduct: '',
            source: '',
            managerId: '',
            status: 'new',
            type: 'db',
        })
        setFormErrors({})
    }, [])

    // 총 페이지 수 계산
    const totalPages = Math.ceil(totalCount / pageSize)

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
                <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-full mb-4">
                    <Database className="h-8 w-8 text-red-500" />
                </div>
                <h2 className="text-xl font-semibold mb-2">접근 권한이 없습니다</h2>
                <p className="text-muted-foreground">이 페이지는 관리자 전용입니다.</p>
            </div>
        )
    }

    // 모바일 카드 렌더링
    const renderMobileCard = (customer: CustomerWithManager) => (
        <div key={customer.id} className="bg-card border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-start">
                <div>
                    <h3
                        className="font-semibold text-base cursor-pointer hover:text-primary hover:underline"
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
                        className="h-7 px-2 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                    >
                        {CUSTOMER_STATUSES.map(status => (
                            <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                    </select>
                ) : (
                    <span className="px-2 py-1 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800">
                        {CUSTOMER_STATUSES.find(s => s.value === customer.status)?.label || customer.status}
                    </span>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                    <span className="text-muted-foreground">등록일:</span>
                    <span className="ml-1">{customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : '-'}</span>
                </div>
            </div>

            {/* 관심상품 */}
            <div>
                <label className="text-xs text-muted-foreground mb-1 block">관심상품</label>
                {isAdmin ? (
                    <Input
                        defaultValue={customer.interestProduct || ''}
                        onBlur={(e) => {
                            if (e.target.value !== (customer.interestProduct || '')) {
                                handleInterestProductSave(customer.id, e.target.value)
                            }
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.currentTarget.blur() }}
                        className="h-8 text-sm"
                        placeholder="관심상품..."
                    />
                ) : (
                    <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">{customer.interestProduct || '-'}</p>
                )}
            </div>

            {/* 담당자 */}
            <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <select
                    value={customer.managerId || ''}
                    onChange={(e) => handleAssign(customer.id, e.target.value)}
                    className="h-8 px-2 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm flex-1"
                >
                    <option value="">담당자 선택</option>
                    {filteredEmployees?.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                    ))}
                </select>
            </div>

            {/* 메모 */}
            <div>
                <label className="text-xs text-muted-foreground mb-1 block">메모</label>
                {canEditMemo(customer) ? (
                    <Input
                        defaultValue={customer.memo || ''}
                        onBlur={(e) => {
                            if (e.target.value !== (customer.memo || '')) {
                                handleMemoSave(customer.id, e.target.value)
                            }
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.currentTarget.blur() }}
                        className="h-8 text-sm"
                        placeholder="메모..."
                    />
                ) : (
                    <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">{customer.memo || '-'}</p>
                )}
            </div>
        </div>
    )

    return (
        <div className="space-y-6 max-w-[1800px] mx-auto p-4 md:p-8 overflow-x-hidden">
            {/* 헤더 */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">DB 관리</h1>
                    <p className="text-muted-foreground mt-1">
                        외부 DB를 등록하고 영업 담당자에게 배분합니다.
                    </p>
                </div>
                <Button onClick={() => setShowAddModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    DB 등록
                </Button>
            </div>

            {/* 탭 */}
            <div className="flex gap-1 border-b">
                <button
                    onClick={() => setActiveTab('inProgress')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'inProgress'
                            ? 'border-b-2 border-primary text-primary'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    진행중
                </button>
                <button
                    onClick={() => setActiveTab('closed')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'closed'
                            ? 'border-b-2 border-primary text-primary'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    청약완료
                </button>
            </div>

            {/* 필터 영역 */}
            <div className="bg-card p-4 rounded-lg border shadow-sm space-y-3">
                {/* 검색 + 필터 토글 (모바일) / 검색 + 필터들 (데스크탑) */}
                <div className="flex items-center gap-2">
                    {/* 검색창 */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                        <Input
                            placeholder="이름, 연락처 검색..."
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            className="border-0 bg-transparent p-0 focus-visible:ring-0 placeholder:text-muted-foreground"
                        />
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
                        <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} />
                    </Button>

                    {/* 데스크탑: 인라인 필터들 */}
                    <div className="hidden md:flex items-center gap-3">
                        <div className="h-6 w-px bg-border" />

                        {/* 상태 필터 (진행중 탭만) */}
                        {activeTab === 'inProgress' && (
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                className="h-9 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
                            >
                                <option value="">전체 상태</option>
                                {CUSTOMER_STATUSES.filter(s => s.value !== 'closed').map(status => (
                                    <option key={status.value} value={status.value}>{status.label}</option>
                                ))}
                            </select>
                        )}

                        {/* 유입경로 필터 */}
                        <select
                            value={filters.source}
                            onChange={(e) => setFilters(prev => ({ ...prev, source: e.target.value }))}
                            className="h-9 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
                        >
                            <option value="">전체 유입경로</option>
                            {sources?.map(src => (
                                <option key={src.id} value={src.name}>{src.name}</option>
                            ))}
                        </select>

                        {/* 담당자 필터 */}
                        <select
                            value={filters.managerId}
                            onChange={(e) => setFilters(prev => ({ ...prev, managerId: e.target.value }))}
                            className="h-9 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
                        >
                            <option value="">전체 담당자</option>
                            {filteredEmployees?.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                            ))}
                        </select>

                        {/* 페이지 사이즈 */}
                        <div className="ml-auto flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">표시:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value))
                                    setCurrentPage(1)
                                }}
                                className="h-9 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
                            >
                                {PAGE_SIZE_OPTIONS.map(size => (
                                    <option key={size} value={size}>{size}개</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* 모바일: 펼쳐지는 필터 패널 */}
                {showMobileFilters && (
                    <div className="md:hidden grid grid-cols-2 gap-3 pt-3 border-t">
                        {/* 상태 필터 (진행중 탭만) */}
                        {activeTab === 'inProgress' && (
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">상태</label>
                                <select
                                    value={filters.status}
                                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                    className="w-full h-9 px-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
                                >
                                    <option value="">전체</option>
                                    {CUSTOMER_STATUSES.filter(s => s.value !== 'closed').map(status => (
                                        <option key={status.value} value={status.value}>{status.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* 유입경로 필터 */}
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">유입경로</label>
                            <select
                                value={filters.source}
                                onChange={(e) => setFilters(prev => ({ ...prev, source: e.target.value }))}
                                className="w-full h-9 px-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
                            >
                                <option value="">전체</option>
                                {sources?.map(src => (
                                    <option key={src.id} value={src.name}>{src.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* 담당자 필터 */}
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">담당자</label>
                            <select
                                value={filters.managerId}
                                onChange={(e) => setFilters(prev => ({ ...prev, managerId: e.target.value }))}
                                className="w-full h-9 px-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
                            >
                                <option value="">전체</option>
                                {filteredEmployees?.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                                ))}
                            </select>
                        </div>

                        {/* 페이지 사이즈 */}
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">표시 개수</label>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value))
                                    setCurrentPage(1)
                                }}
                                className="w-full h-9 px-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
                            >
                                {PAGE_SIZE_OPTIONS.map(size => (
                                    <option key={size} value={size}>{size}개</option>
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
                    {activeTab === 'closed' ? '청약완료된 고객이 없습니다.' : '등록된 DB가 없습니다.'}
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
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="text-left p-3 font-medium whitespace-nowrap w-[80px]">등록일</th>
                                <th className="text-left p-3 font-medium w-[90px]">담당자</th>
                                <th className="text-left p-3 font-medium whitespace-nowrap w-[70px]">고객명</th>
                                <th className="text-left p-3 font-medium whitespace-nowrap w-[110px]">연락처</th>
                                <th className="text-left p-3 font-medium w-[100px]">관심상품</th>
                                {/* 유입경로는 관리자(F1/F2)만 표시 */}
                                {isAdmin && <th className="text-left p-3 font-medium w-[100px]">유입경로</th>}
                                <th className="text-left p-3 font-medium w-[80px]">상태</th>
                                <th className="text-left p-3 font-medium min-w-[200px]">메모</th>
                                <th className="text-left p-3 font-medium w-[120px]">관리자 코멘트</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dbList.map((customer) => (
                                <tr key={customer.id} className="border-b hover:bg-muted/30">
                                    <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">
                                        {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="p-3">
                                        <select
                                            value={customer.managerId || ''}
                                            onChange={(e) => handleAssign(customer.id, e.target.value)}
                                            className="h-8 px-2 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm w-full"
                                        >
                                            <option value="">선택</option>
                                            {filteredEmployees?.map(emp => (
                                                <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="p-3 font-medium whitespace-nowrap">
                                        <span
                                            className="cursor-pointer hover:text-primary hover:underline"
                                            onClick={() => handleCustomerClick(customer.id)}
                                        >
                                            {customer.name}
                                        </span>
                                    </td>
                                    <td className="p-3 whitespace-nowrap">{customer.phone}</td>
                                    <td className="p-3">
                                        {isAdmin ? (
                                            <Input
                                                defaultValue={customer.interestProduct || ''}
                                                onBlur={(e) => {
                                                    if (e.target.value !== (customer.interestProduct || '')) {
                                                        handleInterestProductSave(customer.id, e.target.value)
                                                    }
                                                }}
                                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.currentTarget.blur() }}
                                                className="h-8 text-sm bg-transparent border-zinc-200 dark:border-zinc-700"
                                                placeholder="관심상품..."
                                            />
                                        ) : (
                                            <span className="text-sm text-muted-foreground">{customer.interestProduct || '-'}</span>
                                        )}
                                    </td>
                                    {/* 유입경로는 관리자만 표시 */}
                                    {isAdmin && (
                                        <td className="p-3">
                                            <select
                                                value={customer.source || ''}
                                                onChange={(e) => handleSourceChange(customer.id, e.target.value)}
                                                className="h-8 px-2 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm w-full"
                                            >
                                                <option value="">선택</option>
                                                {sources?.map(src => (
                                                    <option key={src.id} value={src.name}>{src.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                    )}
                                    <td className="p-3">
                                        {canEditMemo(customer) ? (
                                            <select
                                                value={customer.status}
                                                onChange={(e) => handleStatusChange(customer.id, e.target.value)}
                                                className="h-8 px-2 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm w-full"
                                            >
                                                {CUSTOMER_STATUSES.map(status => (
                                                    <option key={status.value} value={status.value}>{status.label}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className="px-2 py-1 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800">
                                                {CUSTOMER_STATUSES.find(s => s.value === customer.status)?.label || customer.status}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        {canEditMemo(customer) ? (
                                            <Input
                                                defaultValue={customer.memo || ''}
                                                onBlur={(e) => {
                                                    if (e.target.value !== (customer.memo || '')) {
                                                        handleMemoSave(customer.id, e.target.value)
                                                    }
                                                }}
                                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.currentTarget.blur() }}
                                                className="h-8 text-sm bg-transparent border-zinc-200 dark:border-zinc-700"
                                                placeholder="메모..."
                                            />
                                        ) : (
                                            <span className="text-sm text-muted-foreground">{customer.memo || '-'}</span>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        {isAdmin ? (
                                            <Input
                                                defaultValue={customer.adminComment || ''}
                                                onBlur={(e) => {
                                                    if (e.target.value !== (customer.adminComment || '')) {
                                                        handleAdminCommentSave(customer.id, e.target.value)
                                                    }
                                                }}
                                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.currentTarget.blur() }}
                                                className="h-8 text-sm bg-transparent border-zinc-200 dark:border-zinc-700"
                                                placeholder="코멘트..."
                                            />
                                        ) : (
                                            <span className="text-sm text-muted-foreground">{customer.adminComment || '-'}</span>
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
                        onClick={() => setCurrentPage(p => p - 1)}
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
                        onClick={() => setCurrentPage(p => p + 1)}
                    >
                        다음
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* 등록 모달 */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleCloseModal}>
                    <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">DB 등록</h3>
                            <Button variant="ghost" size="icon" onClick={handleCloseModal}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="name">고객명 <span className="text-red-500">*</span></Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    onBlur={handleNameBlur}
                                    placeholder="고객명 입력 (한글/영문)"
                                    className={formErrors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                />
                                {formErrors.name && (
                                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        {formErrors.name}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="phone">연락처 <span className="text-red-500">*</span></Label>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">010-</span>
                                    <Input
                                        id="phone"
                                        value={formData.phone || ''}
                                        onChange={(e) => handlePhoneChange(e.target.value)}
                                        onBlur={handlePhoneBlur}
                                        placeholder="12345678"
                                        maxLength={8}
                                        inputMode="numeric"
                                        className={`flex-1 ${formErrors.phone ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                    />
                                </div>
                                {formErrors.phone && (
                                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        {formErrors.phone}
                                    </p>
                                )}
                                <p className="text-muted-foreground text-xs mt-1">숫자 8자리만 입력해주세요.</p>
                            </div>
                            <div>
                                <Label htmlFor="interestProduct">관심항목 <span className="text-red-500">*</span></Label>
                                <Input
                                    id="interestProduct"
                                    value={formData.interestProduct || ''}
                                    onChange={(e) => {
                                        setFormData(prev => ({ ...prev, interestProduct: e.target.value }))
                                        if (formErrors.interestProduct && e.target.value.trim()) {
                                            setFormErrors(prev => ({ ...prev, interestProduct: undefined }))
                                        }
                                    }}
                                    onBlur={handleInterestProductBlur}
                                    placeholder="관심 상품/서비스"
                                    className={formErrors.interestProduct ? 'border-red-500 focus-visible:ring-red-500' : ''}
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
                                    value={formData.source || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                                    className="w-full h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                                >
                                    <option value="">선택</option>
                                    {sources?.map(src => (
                                        <option key={src.id} value={src.name}>{src.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <Label htmlFor="manager">담당자</Label>
                                <select
                                    id="manager"
                                    value={formData.managerId || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, managerId: e.target.value }))}
                                    className="w-full h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                                >
                                    <option value="">선택</option>
                                    {filteredEmployees?.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-2 pt-4">
                                <Button variant="outline" className="flex-1" onClick={handleCloseModal}>
                                    취소
                                </Button>
                                <Button className="flex-1" onClick={handleAddSubmit} disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    등록
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
