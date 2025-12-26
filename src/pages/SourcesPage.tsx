import { useState } from 'react'
import { useSources, useCreateSource, useUpdateSource, useDeleteSource } from '@/hooks/useSources'
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
import { Plus, Pencil, Trash2, Loader2, Tag } from 'lucide-react'
import type { Source } from '@/services/sources'

export function SourcesPage() {
    const { employee } = useAuthStore()
    const { data: sources, isLoading } = useSources()
    const createSource = useCreateSource()
    const updateSource = useUpdateSource()
    const deleteSource = useDeleteSource()

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingSource, setEditingSource] = useState<Source | null>(null)
    const [sourceName, setSourceName] = useState('')

    // F1 관리자만 접근 가능
    if (employee?.securityLevel !== 'F1') {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">접근 권한 없음</h2>
                    <p className="text-zinc-500 mt-2">유입경로 관리는 관리자(F1)만 접근할 수 있습니다.</p>
                </div>
            </div>
        )
    }

    const handleOpenDialog = (source?: Source) => {
        if (source) {
            setEditingSource(source)
            setSourceName(source.name)
        } else {
            setEditingSource(null)
            setSourceName('')
        }
        setIsDialogOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!sourceName.trim()) return

        try {
            if (editingSource) {
                await updateSource.mutateAsync({
                    id: editingSource.id,
                    name: sourceName.trim(),
                })
            } else {
                await createSource.mutateAsync({ name: sourceName.trim() })
            }
            setIsDialogOpen(false)
        } catch (error) {
            console.error('Failed to save source:', error)
        }
    }

    const handleDelete = async (id: number) => {
        if (window.confirm('정말 이 유입경로를 삭제하시겠습니까?\n\n이 유입경로를 사용하는 고객 데이터에 영향을 줄 수 있습니다.')) {
            try {
                await deleteSource.mutateAsync(id)
            } catch (error) {
                console.error('Failed to delete source:', error)
            }
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
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">유입경로 관리</h1>
                    <p className="text-zinc-500 dark:text-zinc-400">고객 유입 채널을 관리합니다</p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    유입경로 추가
                </Button>
            </div>

            {/* Source List */}
            <Card className="border-border bg-card rounded-xl shadow-lg">
                <CardHeader className="border-b border-border">
                    <CardTitle className="text-foreground flex items-center gap-2">
                        <Tag className="h-5 w-5" />
                        유입경로 목록
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                        총 {sources?.length || 0}개
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {sources?.length === 0 ? (
                        <div className="text-center py-12 text-zinc-500">
                            <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>등록된 유입경로가 없습니다</p>
                            <p className="text-sm mt-1">유입경로를 추가하여 고객 유입 채널을 관리하세요</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {sources?.map((source) => (
                                <div
                                    key={source.id}
                                    className="flex items-center justify-between py-4 hover:bg-secondary/50 px-4 -mx-4 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Tag className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-foreground">{source.name}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleOpenDialog(source)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(source.id)}
                                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-zinc-900 dark:text-white">
                            {editingSource ? '유입경로 수정' : '유입경로 추가'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingSource ? '이름을 수정합니다' : '새로운 유입경로를 추가합니다'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">이름 *</Label>
                            <Input
                                id="name"
                                value={sourceName}
                                onChange={(e) => setSourceName(e.target.value)}
                                required
                                className="bg-white dark:bg-zinc-800"
                                placeholder="예: 블로그, 유튜브, 지인 소개"
                            />
                        </div>
                        <div className="flex gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                                취소
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1"
                                disabled={createSource.isPending || updateSource.isPending}
                            >
                                {(createSource.isPending || updateSource.isPending) && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {editingSource ? '수정' : '추가'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
