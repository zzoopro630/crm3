import { useState } from 'react'
import { usePendingApprovals, useApproveUser, useRejectUser, useEmployees } from '@/hooks/useEmployees'
import { useOrganizations } from '@/hooks/useOrganizations'
import { useAuthStore } from '@/stores/authStore'
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Check, X, Loader2 } from 'lucide-react'
import type { PendingApproval, CreateEmployeeInput } from '@/types/employee'
import { SECURITY_LEVELS } from '@/types/employee'

export function PendingApprovalsPage() {
    const { data: approvals, isLoading, refetch } = usePendingApprovals()
    const { data: employees } = useEmployees()
    const { data: organizations } = useOrganizations()
    const approveUser = useApproveUser()
    const rejectUser = useRejectUser()
    const { user } = useAuthStore()

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null)
    const [formData, setFormData] = useState<CreateEmployeeInput>({
        email: '',
        fullName: '',
        securityLevel: 'F5',
        parentId: null,
        organizationId: null,
        positionName: '',
        department: '',
    })

    const handleApprove = (approval: PendingApproval) => {
        setSelectedApproval(approval)
        setFormData({
            email: approval.email,
            fullName: '',
            securityLevel: 'F5',
            parentId: null,
            organizationId: null,
            positionName: '',
            department: '',
        })
        setIsDialogOpen(true)
    }

    const handleSubmitApproval = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedApproval || !user) return

        try {
            await approveUser.mutateAsync({
                approvalId: selectedApproval.id,
                employeeData: formData,
                approvedBy: user.id,
            })
            setIsDialogOpen(false)
            refetch()
            alert(`'${formData.fullName}'님 계정이 승인되었습니다.`)
        } catch (error) {
            const reason = error instanceof Error ? error.message : '알 수 없는 오류'
            setIsDialogOpen(false)
            refetch()
            alert(`승인 실패: ${reason}\n\n이메일: ${selectedApproval.email}`)
        }
    }

    const handleReject = async (approval: PendingApproval) => {
        if (!user) return
        if (window.confirm(`${approval.email} 사용자의 가입을 거절하시겠습니까?`)) {
            try {
                await rejectUser.mutateAsync({
                    approvalId: approval.id,
                    rejectedBy: user.id,
                })
                refetch()
            } catch (error) {
                console.error('Failed to reject user:', error)
                refetch()
            }
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header removed */}

            {/* Pending List */}
            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <CardHeader>
                    <CardTitle className="text-zinc-900 dark:text-white">대기 목록</CardTitle>
                    <CardDescription>{approvals?.length || 0}건의 승인 대기</CardDescription>
                </CardHeader>
                <CardContent>
                    {approvals?.length === 0 ? (
                        <div className="text-center py-12 text-zinc-500">
                            <p>승인 대기 중인 요청이 없습니다</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {approvals?.map((approval) => (
                                <div
                                    key={approval.id}
                                    className="flex items-center justify-between p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50"
                                >
                                    <div>
                                        <p className="font-medium text-zinc-900 dark:text-white">
                                            {approval.email}
                                        </p>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                            요청일: {approval.requestedAt ? formatDate(approval.requestedAt.toString()) : '-'}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => handleApprove(approval)}
                                            className="bg-emerald-600 hover:bg-emerald-700"
                                        >
                                            <Check className="mr-1 h-4 w-4" />
                                            승인
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleReject(approval)}
                                            className="text-red-500 border-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                                        >
                                            <X className="mr-1 h-4 w-4" />
                                            거절
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Approve Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-zinc-900 dark:text-white">사원 정보 입력</DialogTitle>
                        <DialogDescription>
                            {selectedApproval?.email} 사용자의 사원 정보를 입력하세요
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitApproval} className="mt-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">이메일</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                disabled
                                className="bg-zinc-100 dark:bg-zinc-800"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="fullName">이름 *</Label>
                            <Input
                                id="fullName"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                required
                                className="bg-white dark:bg-zinc-800"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="securityLevel">보안등급 *</Label>
                            <select
                                id="securityLevel"
                                value={formData.securityLevel}
                                onChange={(e) => setFormData({ ...formData, securityLevel: e.target.value as CreateEmployeeInput['securityLevel'] })}
                                className="w-full h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                            >
                                {SECURITY_LEVELS.map((level) => (
                                    <option key={level.value} value={level.value}>
                                        {level.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="organizationId">조직</Label>
                            <select
                                id="organizationId"
                                value={formData.organizationId || ''}
                                onChange={(e) => setFormData({ ...formData, organizationId: e.target.value ? parseInt(e.target.value) : null })}
                                className="w-full h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                            >
                                <option value="">선택 안함</option>
                                {organizations?.map((org) => (
                                    <option key={org.id} value={org.id}>
                                        {org.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="parentId">상위자</Label>
                            <select
                                id="parentId"
                                value={formData.parentId || ''}
                                onChange={(e) => setFormData({ ...formData, parentId: e.target.value || null })}
                                className="w-full h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                            >
                                <option value="">선택 안함</option>
                                {employees?.filter(e => e.isActive).map((emp) => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.fullName} ({emp.securityLevel})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="positionName">직급</Label>
                            <Input
                                id="positionName"
                                value={formData.positionName || ''}
                                onChange={(e) => setFormData({ ...formData, positionName: e.target.value })}
                                className="bg-white dark:bg-zinc-800"
                            />
                        </div>
                        <div className="flex gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                                취소
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                disabled={approveUser.isPending}
                            >
                                {approveUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                승인 완료
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}

