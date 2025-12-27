import { useState } from 'react'
import { useCustomerContracts, useCreateContract, useUpdateContract, useDeleteContract } from '@/hooks/useContracts'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Plus, Pencil, Trash2, Save, X, FileText } from 'lucide-react'
import type { Contract } from '@/db/schema'

interface ContractListProps {
    customerId: number
}

interface ContractFormData {
    insuranceCompany: string
    productName: string
    premium: string
    paymentPeriod: string
    memo: string
}

const initialFormData: ContractFormData = {
    insuranceCompany: '',
    productName: '',
    premium: '',
    paymentPeriod: '',
    memo: '',
}

export function ContractList({ customerId }: ContractListProps) {
    const { employee } = useAuthStore()
    const { data: contracts, isLoading } = useCustomerContracts(customerId)
    const createContract = useCreateContract()
    const updateContract = useUpdateContract()
    const deleteContract = useDeleteContract()

    const [isAdding, setIsAdding] = useState(false)
    const [formData, setFormData] = useState<ContractFormData>(initialFormData)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editData, setEditData] = useState<ContractFormData>(initialFormData)

    // 모바일 감지
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

    const handleAdd = async () => {
        if (!formData.insuranceCompany.trim() || !formData.productName.trim() || !employee?.id) return

        try {
            await createContract.mutateAsync({
                customerId,
                insuranceCompany: formData.insuranceCompany.trim(),
                productName: formData.productName.trim(),
                premium: formData.premium ? parseInt(formData.premium) : undefined,
                paymentPeriod: formData.paymentPeriod.trim() || undefined,
                memo: formData.memo.trim() || undefined,
                createdBy: employee.id,
            })
            setFormData(initialFormData)
            setIsAdding(false)
        } catch (error) {
            console.error('Failed to add contract:', error)
        }
    }

    const handleUpdate = async (id: number) => {
        if (!editData.insuranceCompany.trim() || !editData.productName.trim()) return

        try {
            await updateContract.mutateAsync({
                id,
                input: {
                    insuranceCompany: editData.insuranceCompany.trim(),
                    productName: editData.productName.trim(),
                    premium: editData.premium ? parseInt(editData.premium) : undefined,
                    paymentPeriod: editData.paymentPeriod.trim() || undefined,
                    memo: editData.memo.trim() || undefined,
                },
            })
            setEditingId(null)
            setEditData(initialFormData)
        } catch (error) {
            console.error('Failed to update contract:', error)
        }
    }

    const handleDelete = async (id: number) => {
        if (!window.confirm('이 계약을 삭제하시겠습니까?')) return

        try {
            await deleteContract.mutateAsync(id)
        } catch (error) {
            console.error('Failed to delete contract:', error)
        }
    }

    const startEdit = (contract: Contract) => {
        setEditingId(contract.id)
        setEditData({
            insuranceCompany: contract.insuranceCompany || '',
            productName: contract.productName || '',
            premium: contract.premium?.toString() || '',
            paymentPeriod: contract.paymentPeriod || '',
            memo: contract.memo || '',
        })
    }

    const formatCurrency = (value: number | null | undefined) => {
        if (!value) return '-'
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value)
    }

    return (
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-zinc-900 dark:text-white flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    계약 정보
                </CardTitle>
                {!isAdding && (
                    <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
                        <Plus className="h-4 w-4 mr-1" />
                        계약 추가
                    </Button>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {/* 새 계약 입력 폼 */}
                {isAdding && (
                    <ContractForm
                        formData={formData}
                        onChange={setFormData}
                        onSave={handleAdd}
                        onCancel={() => { setIsAdding(false); setFormData(initialFormData) }}
                        isLoading={createContract.isPending}
                    />
                )}

                {/* 계약 목록 */}
                {isLoading ? (
                    <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                    </div>
                ) : contracts && contracts.length > 0 ? (
                    isMobile ? (
                        // 모바일: 카드 뷰
                        <div className="space-y-3">
                            {contracts.map((contract) => (
                                <div key={contract.id}>
                                    {editingId === contract.id ? (
                                        <ContractForm
                                            formData={editData}
                                            onChange={setEditData}
                                            onSave={() => handleUpdate(contract.id)}
                                            onCancel={() => setEditingId(null)}
                                            isLoading={updateContract.isPending}
                                        />
                                    ) : (
                                        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="font-medium text-zinc-900 dark:text-white">{contract.insuranceCompany}</p>
                                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{contract.productName}</p>
                                                </div>
                                                {employee?.id === contract.createdBy && (
                                                    <div className="flex gap-1">
                                                        <Button variant="ghost" size="sm" onClick={() => startEdit(contract)}>
                                                            <Pencil className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDelete(contract.id)}
                                                            className="text-red-500"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div>
                                                    <span className="text-zinc-500">보험료:</span>
                                                    <span className="ml-1 text-zinc-900 dark:text-white">{formatCurrency(contract.premium)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-zinc-500">납입기간:</span>
                                                    <span className="ml-1 text-zinc-900 dark:text-white">{contract.paymentPeriod || '-'}</span>
                                                </div>
                                            </div>
                                            {contract.memo && (
                                                <p className="mt-2 text-xs text-zinc-500 border-t border-zinc-200 dark:border-zinc-600 pt-2">
                                                    {contract.memo}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        // PC: 테이블 뷰
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-zinc-200 dark:border-zinc-700">
                                        <th className="text-left py-2 px-3 text-zinc-500 font-medium">보험사</th>
                                        <th className="text-left py-2 px-3 text-zinc-500 font-medium">상품명</th>
                                        <th className="text-right py-2 px-3 text-zinc-500 font-medium">보험료</th>
                                        <th className="text-left py-2 px-3 text-zinc-500 font-medium">납입기간</th>
                                        <th className="text-left py-2 px-3 text-zinc-500 font-medium">메모</th>
                                        <th className="text-center py-2 px-3 text-zinc-500 font-medium">액션</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contracts.map((contract) => (
                                        <tr key={contract.id} className="border-b border-zinc-100 dark:border-zinc-800">
                                            {editingId === contract.id ? (
                                                <td colSpan={6} className="py-2">
                                                    <ContractForm
                                                        formData={editData}
                                                        onChange={setEditData}
                                                        onSave={() => handleUpdate(contract.id)}
                                                        onCancel={() => setEditingId(null)}
                                                        isLoading={updateContract.isPending}
                                                        inline
                                                    />
                                                </td>
                                            ) : (
                                                <>
                                                    <td className="py-2 px-3 text-zinc-900 dark:text-white">{contract.insuranceCompany}</td>
                                                    <td className="py-2 px-3 text-zinc-900 dark:text-white">{contract.productName}</td>
                                                    <td className="py-2 px-3 text-right text-zinc-900 dark:text-white">{formatCurrency(contract.premium)}</td>
                                                    <td className="py-2 px-3 text-zinc-600 dark:text-zinc-400">{contract.paymentPeriod || '-'}</td>
                                                    <td className="py-2 px-3 text-zinc-600 dark:text-zinc-400 max-w-[150px] truncate">{contract.memo || '-'}</td>
                                                    <td className="py-2 px-3 text-center">
                                                        {employee?.id === contract.createdBy && (
                                                            <div className="flex gap-1 justify-center">
                                                                <Button variant="ghost" size="sm" onClick={() => startEdit(contract)}>
                                                                    <Pencil className="h-3 w-3" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleDelete(contract.id)}
                                                                    className="text-red-500"
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                ) : (
                    <p className="text-center text-zinc-500 py-4">등록된 계약이 없습니다.</p>
                )}
            </CardContent>
        </Card>
    )
}

// 계약 입력 폼 컴포넌트
interface ContractFormProps {
    formData: ContractFormData
    onChange: (data: ContractFormData) => void
    onSave: () => void
    onCancel: () => void
    isLoading: boolean
    inline?: boolean
}

function ContractForm({ formData, onChange, onSave, onCancel, isLoading, inline }: ContractFormProps) {
    const containerClass = inline
        ? 'flex flex-wrap gap-2 items-end p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg'
        : 'space-y-3 p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800'

    return (
        <div className={containerClass}>
            <div className={inline ? 'flex-1 min-w-[120px]' : ''}>
                <Label className="text-xs">보험사 *</Label>
                <Input
                    value={formData.insuranceCompany}
                    onChange={(e) => onChange({ ...formData, insuranceCompany: e.target.value })}
                    placeholder="보험사명"
                    className="bg-white dark:bg-zinc-900 h-8"
                />
            </div>
            <div className={inline ? 'flex-1 min-w-[120px]' : ''}>
                <Label className="text-xs">상품명 *</Label>
                <Input
                    value={formData.productName}
                    onChange={(e) => onChange({ ...formData, productName: e.target.value })}
                    placeholder="상품명"
                    className="bg-white dark:bg-zinc-900 h-8"
                />
            </div>
            <div className={inline ? 'w-[100px]' : ''}>
                <Label className="text-xs">보험료</Label>
                <Input
                    type="number"
                    value={formData.premium}
                    onChange={(e) => onChange({ ...formData, premium: e.target.value })}
                    placeholder="0"
                    className="bg-white dark:bg-zinc-900 h-8"
                />
            </div>
            <div className={inline ? 'w-[100px]' : ''}>
                <Label className="text-xs">납입기간</Label>
                <Input
                    value={formData.paymentPeriod}
                    onChange={(e) => onChange({ ...formData, paymentPeriod: e.target.value })}
                    placeholder="예: 20년"
                    className="bg-white dark:bg-zinc-900 h-8"
                />
            </div>
            {!inline && (
                <div>
                    <Label className="text-xs">메모</Label>
                    <Input
                        value={formData.memo}
                        onChange={(e) => onChange({ ...formData, memo: e.target.value })}
                        placeholder="메모"
                        className="bg-white dark:bg-zinc-900 h-8"
                    />
                </div>
            )}
            <div className={inline ? 'flex gap-1' : 'flex gap-2 justify-end'}>
                <Button variant="ghost" size="sm" onClick={onCancel}>
                    <X className="h-4 w-4" />
                </Button>
                <Button
                    size="sm"
                    onClick={onSave}
                    disabled={isLoading || !formData.insuranceCompany.trim() || !formData.productName.trim()}
                >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
            </div>
        </div>
    )
}
