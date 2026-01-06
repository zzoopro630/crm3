import { useState } from 'react'
import { useSources, useCreateSource, useUpdateSource, useDeleteSource } from '@/hooks/useSources'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Plus, Minus, Loader2, Tag, CircleDot } from 'lucide-react'
import type { Source } from '@/services/sources'

// 상태 타입 (고정값)
const STATUS_ITEMS = [
    { value: 'new', label: '신규', color: 'bg-blue-500' },
    { value: 'contacted', label: '연락완료', color: 'bg-yellow-500' },
    { value: 'consulting', label: '상담중', color: 'bg-purple-500' },
    { value: 'closed', label: '청약완료', color: 'bg-emerald-500' },
    { value: 'called', label: '통화완료', color: 'bg-lime-500' },
    { value: 'texted', label: '문자남김', color: 'bg-orange-500' },
    { value: 'no_answer', label: '부재', color: 'bg-zinc-400' },
    { value: 'rejected', label: '거절', color: 'bg-red-500' },
    { value: 'wrong_number', label: '결번', color: 'bg-zinc-800' },
    { value: 'ineligible', label: '가입불가', color: 'bg-pink-500' },
    { value: 'upsell', label: '추가제안', color: 'bg-cyan-500' },
]

// 인라인 편집 아이템 컴포넌트
function EditableItem({
    value,
    onSave,
    onDelete,
    isLoading,
    color,
}: {
    value: string
    onSave: (newValue: string) => Promise<void>
    onDelete?: () => void
    isLoading?: boolean
    color?: string
}) {
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState(value)
    const [isSaving, setIsSaving] = useState(false)

    const handleSave = async () => {
        if (editValue.trim() === value) {
            setIsEditing(false)
            return
        }
        if (!editValue.trim()) {
            setEditValue(value)
            setIsEditing(false)
            return
        }
        setIsSaving(true)
        try {
            await onSave(editValue.trim())
            setIsEditing(false)
        } catch (error) {
            console.error('저장 실패:', error)
            setEditValue(value)
        } finally {
            setIsSaving(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave()
        } else if (e.key === 'Escape') {
            setEditValue(value)
            setIsEditing(false)
        }
    }

    if (isLoading || isSaving) {
        return (
            <div className="flex items-center gap-2 py-2 px-3">
                <Loader2 className="h-4 w-4 animate-spin" />
            </div>
        )
    }

    if (isEditing) {
        return (
            <div className="flex items-center gap-2">
                <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="h-8 text-sm"
                />
            </div>
        )
    }

    return (
        <div className="flex items-center justify-between group py-2 px-3 rounded-md hover:bg-secondary/50 transition-colors">
            <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 text-left flex-1"
            >
                {color && <span className={`w-3 h-3 rounded-full ${color}`} />}
                <span className="text-sm">{value}</span>
            </button>
            {onDelete && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600"
                    onClick={onDelete}
                >
                    <Minus className="h-3 w-3" />
                </Button>
            )}
        </div>
    )
}

export function LabelsPage() {
    const { employee } = useAuthStore()
    const { data: sources, isLoading } = useSources()
    const createSource = useCreateSource()
    const updateSource = useUpdateSource()
    const deleteSource = useDeleteSource()

    const [newSourceName, setNewSourceName] = useState('')
    const [isAddingSource, setIsAddingSource] = useState(false)

    // F1 관리자만 접근 가능
    if (employee?.securityLevel !== 'F1') {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">접근 권한 없음</h2>
                    <p className="text-zinc-500 mt-2">라벨 관리는 관리자(F1)만 접근할 수 있습니다.</p>
                </div>
            </div>
        )
    }

    const handleAddSource = async () => {
        if (!newSourceName.trim()) return
        try {
            await createSource.mutateAsync({ name: newSourceName.trim() })
            setNewSourceName('')
            setIsAddingSource(false)
        } catch (error) {
            console.error('추가 실패:', error)
        }
    }

    const handleUpdateSource = async (source: Source, newName: string) => {
        await updateSource.mutateAsync({ id: source.id, name: newName })
    }

    const handleDeleteSource = async (id: number) => {
        if (window.confirm('정말 삭제하시겠습니까?')) {
            await deleteSource.mutateAsync(id)
        }
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
            <div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">라벨 관리</h2>
                <p className="text-zinc-500 dark:text-zinc-400">고객 분류에 사용되는 라벨을 관리합니다</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 유입경로 관리 */}
                <Card className="border-border bg-card">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            유입경로
                        </CardTitle>
                        <CardDescription>고객 유입 채널</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1 mb-4">
                            {sources?.length === 0 ? (
                                <p className="text-sm text-zinc-500 py-4 text-center">등록된 항목이 없습니다</p>
                            ) : (
                                sources?.map((source) => (
                                    <EditableItem
                                        key={source.id}
                                        value={source.name}
                                        onSave={(newName) => handleUpdateSource(source, newName)}
                                        onDelete={() => handleDeleteSource(source.id)}
                                    />
                                ))
                            )}
                        </div>

                        {isAddingSource ? (
                            <div className="flex gap-2">
                                <Input
                                    value={newSourceName}
                                    onChange={(e) => setNewSourceName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddSource()}
                                    placeholder="새 유입경로"
                                    autoFocus
                                    className="h-8 text-sm"
                                />
                                <Button size="sm" onClick={handleAddSource} disabled={createSource.isPending}>
                                    {createSource.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : '추가'}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setIsAddingSource(false)}>
                                    취소
                                </Button>
                            </div>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => setIsAddingSource(true)}
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                추가
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* 상태 관리 */}
                <Card className="border-border bg-card">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <CircleDot className="h-4 w-4" />
                            상태
                        </CardTitle>
                        <CardDescription>고객 진행 상태 (시스템 고정)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            {STATUS_ITEMS.map((status) => (
                                <div
                                    key={status.value}
                                    className="flex items-center gap-2 py-2 px-3 rounded-md"
                                >
                                    <span className={`w-3 h-3 rounded-full ${status.color}`} />
                                    <span className="text-sm">{status.label}</span>
                                    <span className="text-xs text-zinc-400 ml-auto">({status.value})</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-zinc-400 mt-4 text-center">
                            상태 항목은 시스템에서 고정되어 있습니다
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
