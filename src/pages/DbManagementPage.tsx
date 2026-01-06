import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEmployees } from '@/hooks/useEmployees'
import { useSources } from '@/hooks/useSources'
import { useAuthStore } from '@/stores/authStore'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Search, Database, Upload, User, Phone } from 'lucide-react'
import { updateCustomer, getCustomers } from '@/services/customers'
import type { CustomerWithManager } from '@/types/customer'
import { CUSTOMER_STATUSES } from '@/types/customer'

export default function DbManagementPage() {
    const navigate = useNavigate()
    const { employee } = useAuthStore()
    const isAdmin = employee?.securityLevel === 'F1' || employee?.securityLevel === 'F2'

    // DB 목록 상태
    const [dbList, setDbList] = useState<CustomerWithManager[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [filters, setFilters] = useState({
        type: 'db',
        status: '',
        managerId: '',
    })

    // 직원 목록 (배정용)
    const { data: employees } = useEmployees()
    // 유입경로 목록
    const { data: sources } = useSources()

    useEffect(() => {
        fetchDbList()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters])

    const fetchDbList = async () => {
        setIsLoading(true)
        try {
            const response = await getCustomers({
                page: 1,
                limit: 100,
                filters: {
                    ...filters,
                    type: 'db'
                }
            })
            setDbList(response.data)
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
                    ? { ...item, managerId, managerName: employees?.find(e => e.id === managerId)?.fullName || '' }
                    : item
            ))
        } catch (error) {
            console.error('Failed to assign manager:', error)
            alert('담당자 배정에 실패했습니다.')
        }
    }

    // 메모 저장 (담당자 또는 관리자)
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

    // 관리자 코멘트 저장 (관리자만)
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

    // 관심상품 저장 (관리자만)
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

    // 유입경로 저장 (관리자만)
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

    // 상태 저장 (담당자 또는 관리자)
    const handleStatusChange = async (customerId: number, status: string) => {
        const customer = dbList.find(c => c.id === customerId)
        if (!customer) return
        // 담당자이거나 관리자만 변경 가능
        if (!isAdmin && customer.managerId !== employee?.id) return
        try {
            await updateCustomer(customerId, { status })
            setDbList(prev => prev.map(item =>
                item.id === customerId ? { ...item, status } : item
            ))
        } catch (error) {
            console.error('Failed to save status:', error)
        }
    }

    // 담당자인지 확인 (메모/상태 수정 권한)
    const canEditMemo = (customer: CustomerWithManager) => {
        return isAdmin || customer.managerId === employee?.id
    }

    // 고객명 클릭 → 상세보기
    const handleCustomerClick = (customerId: number) => {
        navigate(`/customers/${customerId}`)
    }

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
            {/* 헤더: 이름 + 상태 */}
            <div className="flex justify-between items-start">
                <div>
                    <h3
                        className="font-semibold text-base cursor-pointer hover:text-primary hover:underline"
                        onClick={() => handleCustomerClick(customer.id)}
                    >
                        {customer.name}
                    </h3>
                    {/* 모바일 전화 링크 */}
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
                {/* 상태 드롭다운 */}
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
                    <span className="px-2 py-1 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800 capitalize">
                        {customer.status}
                    </span>
                )}
            </div>

            {/* 정보 */}
            <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                    <span className="text-muted-foreground">등록일:</span>
                    <span className="ml-1">{customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : '-'}</span>
                </div>
            </div>

            {/* 유입경로 드롭다운 (관리자) */}
            <div>
                <label className="text-xs text-muted-foreground mb-1 block">유입경로</label>
                {isAdmin ? (
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
                ) : (
                    <p className="text-sm">{customer.source || '-'}</p>
                )}
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
                        placeholder="관심상품 입력..."
                    />
                ) : (
                    <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">{customer.interestProduct || '-'}</p>
                )}
            </div>

            {/* 담당자 */}
            <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <select
                    value={customer.managerId}
                    onChange={(e) => handleAssign(customer.id, e.target.value)}
                    className="h-8 px-2 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm flex-1"
                >
                    <option value="">담당자 선택</option>
                    {employees?.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                    ))}
                </select>
            </div>

            {/* 메모 */}
            <div>
                <label className="text-xs text-muted-foreground mb-1 block">메모 (담당자)</label>
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
                        placeholder="메모 입력..."
                    />
                ) : (
                    <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">{customer.memo || '-'}</p>
                )}
            </div>

            {/* 관리자 코멘트 */}
            <div>
                <label className="text-xs text-muted-foreground mb-1 block">관리자 코멘트</label>
                {isAdmin ? (
                    <Input
                        defaultValue={customer.adminComment || ''}
                        onBlur={(e) => {
                            if (e.target.value !== (customer.adminComment || '')) {
                                handleAdminCommentSave(customer.id, e.target.value)
                            }
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.currentTarget.blur() }}
                        className="h-8 text-sm"
                        placeholder="코멘트 입력..."
                    />
                ) : (
                    <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">{customer.adminComment || '-'}</p>
                )}
            </div>
        </div>
    )

    return (
        <div className="space-y-6 max-w-[1800px] mx-auto p-4 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">DB 관리</h1>
                    <p className="text-muted-foreground mt-1">
                        외부 DB를 등록하고 영업 담당자에게 배분합니다.
                    </p>
                </div>
                <Button onClick={() => { /* TODO: 등록 모달 열기 */ }}>
                    <Upload className="mr-2 h-4 w-4" />
                    DB 등록
                </Button>
            </div>

            {/* 필터 영역 */}
            <div className="flex flex-wrap gap-4 items-center bg-card p-4 rounded-lg border shadow-sm">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="이름, 연락처 검색..."
                    className="max-w-xs border-0 bg-transparent p-0 focus-visible:ring-0 placeholder:text-muted-foreground"
                />
                <div className="h-6 w-px bg-border hidden md:block" />
                <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm"
                >
                    <option value="">전체 상태</option>
                    {CUSTOMER_STATUSES.map(status => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                </select>
                <select
                    value={filters.managerId}
                    onChange={(e) => setFilters(prev => ({ ...prev, managerId: e.target.value }))}
                    className="h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm"
                >
                    <option value="">전체 담당자</option>
                    {employees?.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                    ))}
                </select>
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
                    등록된 DB가 없습니다.
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
                                <th className="text-left p-3 font-medium whitespace-nowrap">등록일</th>
                                <th className="text-left p-3 font-medium whitespace-nowrap">고객명</th>
                                <th className="text-left p-3 font-medium whitespace-nowrap">연락처</th>
                                <th className="text-left p-3 font-medium min-w-[150px]">관심상품</th>
                                <th className="text-left p-3 font-medium min-w-[120px]">유입경로</th>
                                <th className="text-left p-3 font-medium min-w-[100px]">상태</th>
                                <th className="text-left p-3 font-medium min-w-[250px]">메모 (담당자)</th>
                                <th className="text-left p-3 font-medium min-w-[180px]">관리자 코멘트</th>
                                <th className="text-left p-3 font-medium w-[100px]">담당자</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dbList.map((customer) => (
                                <tr key={customer.id} className="border-b hover:bg-muted/30">
                                    <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">
                                        {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : '-'}
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
                                                placeholder="관심상품 입력..."
                                            />
                                        ) : (
                                            <span className="text-sm text-muted-foreground">{customer.interestProduct || '-'}</span>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        {isAdmin ? (
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
                                        ) : (
                                            <span className="text-sm text-muted-foreground">{customer.source || '-'}</span>
                                        )}
                                    </td>
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
                                            <span className="px-2 py-1 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800 capitalize">
                                                {customer.status}
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
                                                placeholder="메모 입력..."
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
                                                placeholder="코멘트 입력..."
                                            />
                                        ) : (
                                            <span className="text-sm text-muted-foreground">{customer.adminComment || '-'}</span>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        <select
                                            value={customer.managerId}
                                            onChange={(e) => handleAssign(customer.id, e.target.value)}
                                            className="h-8 px-2 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm w-full"
                                        >
                                            <option value="">선택</option>
                                            {employees?.map(emp => (
                                                <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
