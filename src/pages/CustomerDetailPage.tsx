import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCustomer, useUpdateCustomer, useDeleteCustomer } from '@/hooks/useCustomers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { ArrowLeft, Loader2, Pencil, Trash2, Save, X } from 'lucide-react'
import type { UpdateCustomerInput } from '@/types/customer'
import { CUSTOMER_STATUSES, GENDER_OPTIONS } from '@/types/customer'

export function CustomerDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const customerId = id ? parseInt(id) : null

    const { data: customer, isLoading } = useCustomer(customerId)
    const updateCustomer = useUpdateCustomer()
    const deleteCustomer = useDeleteCustomer()

    const [isEditing, setIsEditing] = useState(false)
    const [formData, setFormData] = useState<UpdateCustomerInput>({})

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
            closed: '계약완료',
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
                <Button variant="ghost" size="icon" onClick={() => navigate('/customers')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{customer.name}</h1>
                    <p className="text-zinc-500 dark:text-zinc-400">고객 상세 정보</p>
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

            {/* Customer Info */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Basic Info */}
                <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <CardHeader>
                        <CardTitle className="text-zinc-900 dark:text-white">기본 정보</CardTitle>
                        <CardDescription>고객의 기본 정보입니다</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>이름</Label>
                            {isEditing ? (
                                <Input
                                    value={formData.name || ''}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="bg-white dark:bg-zinc-800"
                                />
                            ) : (
                                <p className="text-zinc-900 dark:text-white">{customer.name}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>전화번호</Label>
                            {isEditing ? (
                                <Input
                                    value={formData.phone || ''}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="bg-white dark:bg-zinc-800"
                                />
                            ) : (
                                <p className="text-zinc-900 dark:text-white">{customer.phone || '-'}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>이메일</Label>
                            {isEditing ? (
                                <Input
                                    type="email"
                                    value={formData.email || ''}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="bg-white dark:bg-zinc-800"
                                />
                            ) : (
                                <p className="text-zinc-900 dark:text-white">{customer.email || '-'}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>성별</Label>
                            {isEditing ? (
                                <select
                                    value={formData.gender || ''}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                    className="w-full h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                                >
                                    <option value="">선택</option>
                                    {GENDER_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-zinc-900 dark:text-white">{customer.gender || '-'}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>생년월일</Label>
                            {isEditing ? (
                                <Input
                                    type="date"
                                    value={formData.birthdate || ''}
                                    onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                                    className="bg-white dark:bg-zinc-800"
                                />
                            ) : (
                                <p className="text-zinc-900 dark:text-white">{customer.birthdate || '-'}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Additional Info */}
                <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <CardHeader>
                        <CardTitle className="text-zinc-900 dark:text-white">추가 정보</CardTitle>
                        <CardDescription>고객의 추가 정보입니다</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>상태</Label>
                            {isEditing ? (
                                <select
                                    value={formData.status || ''}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                                >
                                    {CUSTOMER_STATUSES.map(status => (
                                        <option key={status.value} value={status.value}>{status.label}</option>
                                    ))}
                                </select>
                            ) : (
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-md border ${statusBadge.color}`}>
                                    {statusBadge.label}
                                </span>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>담당자</Label>
                            <p className="text-zinc-900 dark:text-white">{customer.managerName || '-'}</p>
                        </div>
                        <div className="space-y-2">
                            <Label>회사</Label>
                            {isEditing ? (
                                <Input
                                    value={formData.company || ''}
                                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                    className="bg-white dark:bg-zinc-800"
                                />
                            ) : (
                                <p className="text-zinc-900 dark:text-white">{customer.company || '-'}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>직급</Label>
                            {isEditing ? (
                                <Input
                                    value={formData.jobTitle || ''}
                                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                                    className="bg-white dark:bg-zinc-800"
                                />
                            ) : (
                                <p className="text-zinc-900 dark:text-white">{customer.jobTitle || '-'}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>유입경로</Label>
                            {isEditing ? (
                                <Input
                                    value={formData.source || ''}
                                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                                    className="bg-white dark:bg-zinc-800"
                                />
                            ) : (
                                <p className="text-zinc-900 dark:text-white">{customer.source || '-'}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>주소</Label>
                            {isEditing ? (
                                <Input
                                    value={formData.address || ''}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="bg-white dark:bg-zinc-800"
                                />
                            ) : (
                                <p className="text-zinc-900 dark:text-white">{customer.address || '-'}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Timestamps */}
            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <CardContent className="pt-6">
                    <div className="flex gap-8 text-sm text-zinc-500 dark:text-zinc-400">
                        <div>
                            <span className="font-medium">등록일:</span>{' '}
                            {customer.createdAt ? new Date(customer.createdAt).toLocaleString('ko-KR') : '-'}
                        </div>
                        <div>
                            <span className="font-medium">수정일:</span>{' '}
                            {customer.updatedAt ? new Date(customer.updatedAt).toLocaleString('ko-KR') : '-'}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
