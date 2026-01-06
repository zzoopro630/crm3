import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCustomer, useUpdateCustomer, useDeleteCustomer } from '@/hooks/useCustomers'
import { useEmployees } from '@/hooks/useEmployees'
import { useSources } from '@/hooks/useSources'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { ArrowLeft, Loader2, Pencil, Trash2, Save, X, Phone } from 'lucide-react'
import type { UpdateCustomerInput } from '@/types/customer'
import { CUSTOMER_STATUSES, GENDER_OPTIONS } from '@/types/customer'
import { CustomerNotes } from '@/components/customers/CustomerNotes'
import { ContractList } from '@/components/customers/ContractList'
import { AddressSearchModal } from '@/components/customers/AddressSearchModal'

// 추가 정보용 상수
const MARITAL_STATUSES = [
    { value: '미혼', label: '미혼' },
    { value: '기혼', label: '기혼' },
    { value: '기타', label: '기타' },
]

const INCOME_RANGES = [
    { value: '3000만원 미만', label: '3000만원 미만' },
    { value: '3000~5000만원', label: '3000~5000만원' },
    { value: '5000~7000만원', label: '5000~7000만원' },
    { value: '7000만원~1억원', label: '7000만원~1억원' },
    { value: '1억원 이상', label: '1억원 이상' },
]

export function CustomerDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const customerId = id ? parseInt(id) : null

    const { data: customer, isLoading } = useCustomer(customerId)
    const { data: employees } = useEmployees()
    const { data: sources } = useSources()
    const updateCustomer = useUpdateCustomer()
    const deleteCustomer = useDeleteCustomer()

    const [isEditing, setIsEditing] = useState(false)
    const [formData, setFormData] = useState<UpdateCustomerInput>({})
    const [showAddressFinder, setShowAddressFinder] = useState(false)

    const handleAddressSelect = (address: { roadAddress: string; jibunAddress: string; zipcode: string }) => {
        setFormData(prev => ({ ...prev, address: address.roadAddress || address.jibunAddress }))
        setShowAddressFinder(false)
    }

    const handleEdit = () => {
        if (customer) {
            setFormData({
                name: customer.name,
                phone: customer.phone || '',
                email: customer.email || '',
                address: customer.address || '',
                gender: customer.gender || '',
                birthdate: customer.birthdate || '',
                company: customer.company || '',
                jobTitle: customer.jobTitle || '',
                source: customer.source || '',
                status: customer.status,
                managerId: customer.managerId,
            })
            setIsEditing(true)
        }
    }

    const handleCancel = () => {
        setIsEditing(false)
        setFormData({})
    }

    const handleSave = async () => {
        if (!customerId) return

        try {
            await updateCustomer.mutateAsync({
                id: customerId,
                input: formData,
            })
            setIsEditing(false)
        } catch (error) {
            console.error('Failed to update customer:', error)
        }
    }

    const handleDelete = async () => {
        if (!customerId) return

        if (window.confirm('정말 이 고객을 삭제하시겠습니까?')) {
            try {
                await deleteCustomer.mutateAsync(customerId)
                navigate('/customers')
            } catch (error) {
                console.error('Failed to delete customer:', error)
            }
        }
    }

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            new: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
            contacted: 'bg-lime-500/10 text-lime-400 border-lime-500/20',
            consulting: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
            closed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        }
        const labels: Record<string, string> = {
            new: '신규',
            contacted: '연락완료',
            consulting: '상담중',
            closed: '청약완료',
        }
        return { color: colors[status] || colors.new, label: labels[status] || status }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
        )
    }

    if (!customer) {
        return (
            <div className="text-center py-12 text-zinc-500">
                <p>고객을 찾을 수 없습니다</p>
                <Button variant="outline" onClick={() => navigate('/customers')} className="mt-4">
                    목록으로 돌아가기
                </Button>
            </div>
        )
    }

    const statusBadge = getStatusBadge(customer.status)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{customer.name}</h1>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-md border ${statusBadge.color}`}>
                            {statusBadge.label}
                        </span>
                    </div>
                    {customer.phone && (
                        <a
                            href={`tel:${customer.phone}`}
                            className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1 hover:text-primary md:pointer-events-none md:no-underline"
                        >
                            <Phone className="h-4 w-4 md:hidden" />
                            {customer.phone}
                        </a>
                    )}
                </div>
                <div className="flex gap-2">
                    {isEditing ? (
                        <>
                            <Button variant="outline" onClick={handleCancel}>
                                <X className="mr-2 h-4 w-4" />
                                취소
                            </Button>
                            <Button onClick={handleSave} disabled={updateCustomer.isPending}>
                                {updateCustomer.isPending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="mr-2 h-4 w-4" />
                                )}
                                저장
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={handleEdit}>
                                <Pencil className="mr-2 h-4 w-4" />
                                수정
                            </Button>
                            <Button variant="outline" onClick={handleDelete} className="text-red-500 hover:text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                삭제
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Main Content: 2-column layout */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Left Column: 기본 정보 + 추가 정보 */}
                <div className="lg:col-span-1 space-y-4">
                    {/* 기본 정보 */}
                    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-zinc-900 dark:text-white text-base">기본 정보</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-zinc-500">이름</span>
                                {isEditing ? (
                                    <Input
                                        value={formData.name || ''}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-32 h-7 text-sm"
                                    />
                                ) : (
                                    <span className="text-zinc-900 dark:text-white font-medium">{customer.name}</span>
                                )}
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-500">전화번호</span>
                                {isEditing ? (
                                    <Input
                                        value={formData.phone || ''}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-32 h-7 text-sm"
                                    />
                                ) : (
                                    <span className="text-zinc-900 dark:text-white">{customer.phone || '-'}</span>
                                )}
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-500">이메일</span>
                                {isEditing ? (
                                    <Input
                                        type="email"
                                        value={formData.email || ''}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-32 h-7 text-sm"
                                    />
                                ) : (
                                    <span className="text-zinc-900 dark:text-white truncate max-w-[150px]">{customer.email || '-'}</span>
                                )}
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-500">성별</span>
                                {isEditing ? (
                                    <select
                                        value={formData.gender || ''}
                                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                        className="w-20 h-7 text-sm rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                                    >
                                        <option value="">선택</option>
                                        {GENDER_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <span className="text-zinc-900 dark:text-white">{customer.gender || '-'}</span>
                                )}
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-500">생년월일</span>
                                {isEditing ? (
                                    <Input
                                        type="date"
                                        value={formData.birthdate || ''}
                                        onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                                        className="w-32 h-7 text-sm"
                                    />
                                ) : (
                                    <span className="text-zinc-900 dark:text-white">{customer.birthdate || '-'}</span>
                                )}
                            </div>

                            {/* 주소 - 2줄 레이아웃 */}
                            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-zinc-500">주소</span>
                                    {isEditing && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-6 text-xs"
                                            onClick={() => setShowAddressFinder(true)}
                                        >
                                            검색
                                        </Button>
                                    )}
                                </div>
                                {isEditing ? (
                                    <Input
                                        value={formData.address || ''}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full h-7 text-sm"
                                        placeholder="주소 검색..."
                                    />
                                ) : (
                                    <p className="text-zinc-900 dark:text-white text-xs leading-relaxed">{customer.address || '-'}</p>
                                )}
                            </div>

                            <div className="flex justify-between">
                                <span className="text-zinc-500">담당자</span>
                                {isEditing ? (
                                    <select
                                        value={formData.managerId || ''}
                                        onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                                        className="w-24 h-7 text-sm rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                                    >
                                        <option value="">선택</option>
                                        {employees?.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <span className="text-zinc-900 dark:text-white">{customer.managerName || '-'}</span>
                                )}
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-500">상태</span>
                                {isEditing ? (
                                    <select
                                        value={formData.status || ''}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-24 h-7 text-sm rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                                    >
                                        {CUSTOMER_STATUSES.map(status => (
                                            <option key={status.value} value={status.value}>{status.label}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${statusBadge.color}`}>
                                        {statusBadge.label}
                                    </span>
                                )}
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-500">유입경로</span>
                                {isEditing ? (
                                    <select
                                        value={formData.source || ''}
                                        onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                                        className="w-24 h-7 text-sm rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                                    >
                                        <option value="">선택</option>
                                        {sources?.map(src => (
                                            <option key={src.id} value={src.name}>{src.name}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <span className="text-zinc-900 dark:text-white">{customer.source || '-'}</span>
                                )}
                            </div>
                            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-400">
                                등록 {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('ko-KR') : '-'}
                            </div>
                        </CardContent>
                    </Card>

                    {/* 추가 정보 */}
                    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-zinc-900 dark:text-white text-base">추가 정보</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-zinc-500">회사</span>
                                {isEditing ? (
                                    <Input
                                        value={formData.company || ''}
                                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                        className="w-32 h-7 text-sm"
                                    />
                                ) : (
                                    <span className="text-zinc-900 dark:text-white">{customer.company || '-'}</span>
                                )}
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-500">직급</span>
                                {isEditing ? (
                                    <Input
                                        value={formData.jobTitle || ''}
                                        onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                                        className="w-32 h-7 text-sm"
                                    />
                                ) : (
                                    <span className="text-zinc-900 dark:text-white">{customer.jobTitle || '-'}</span>
                                )}
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-500">결혼 여부</span>
                                {isEditing ? (
                                    <select
                                        value={(formData as Record<string, string>).maritalStatus || ''}
                                        onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value } as UpdateCustomerInput)}
                                        className="w-20 h-7 text-sm rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                                    >
                                        <option value="">선택</option>
                                        {MARITAL_STATUSES.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <span className="text-zinc-900 dark:text-white">{customer.maritalStatus || '-'}</span>
                                )}
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-500">연수입</span>
                                {isEditing ? (
                                    <select
                                        value={(formData as Record<string, string>).annualIncome || ''}
                                        onChange={(e) => setFormData({ ...formData, annualIncome: e.target.value } as UpdateCustomerInput)}
                                        className="w-32 h-7 text-sm rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                                    >
                                        <option value="">선택</option>
                                        {INCOME_RANGES.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <span className="text-zinc-900 dark:text-white">{customer.annualIncome || '-'}</span>
                                )}
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-500">기존 보험사</span>
                                {isEditing ? (
                                    <Input
                                        value={(formData as Record<string, string>).existingInsurance || ''}
                                        onChange={(e) => setFormData({ ...formData, existingInsurance: e.target.value } as UpdateCustomerInput)}
                                        className="w-32 h-7 text-sm"
                                        placeholder="예: 삼성생명"
                                    />
                                ) : (
                                    <span className="text-zinc-900 dark:text-white">{customer.existingInsurance || '-'}</span>
                                )}
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-500">보험 유형</span>
                                {isEditing ? (
                                    <Input
                                        value={(formData as Record<string, string>).insuranceType || ''}
                                        onChange={(e) => setFormData({ ...formData, insuranceType: e.target.value } as UpdateCustomerInput)}
                                        className="w-32 h-7 text-sm"
                                        placeholder="예: 생명, 손해"
                                    />
                                ) : (
                                    <span className="text-zinc-900 dark:text-white">{customer.insuranceType || '-'}</span>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: 계약 + 메모 */}
                <div className="lg:col-span-2 space-y-6">
                    {/* 계약 정보 */}
                    {customerId && <ContractList customerId={customerId} />}

                    {/* 메모 */}
                    {customerId && <CustomerNotes customerId={customerId} />}
                </div>
            </div>

            {/* 주소 검색 모달 */}
            {showAddressFinder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddressFinder(false)}>
                    <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 w-full max-w-lg max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">주소 검색</h3>
                            <Button variant="ghost" size="icon" onClick={() => setShowAddressFinder(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <AddressSearchModal onSelect={handleAddressSelect} />
                    </div>
                </div>
            )}
        </div>
    )
}
