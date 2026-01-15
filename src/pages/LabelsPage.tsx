import { useState } from 'react'
import { useLabels, useCreateLabel, useUpdateLabel, useDeleteLabel } from '@/hooks/useLabels'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label as UiLabel } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Edit2, Trash2, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Label as LabelType, NewLabel } from '@/db/schema'

// 미리 정의된 색상 옵션
const COLOR_OPTIONS = [
    '#EF4444', // red-500
    '#F97316', // orange-500  
    '#F59E0B', // amber-500
    '#84CC16', // lime-500
    '#22C55E', // green-500
    '#10B981', // emerald-500
    '#06B6D4', // cyan-500
    '#3B82F6', // blue-500
    '#6366F1', // indigo-500
    '#8B5CF6', // violet-500
    '#A855F7', // purple-500
    '#EC4899', // pink-500
    '#6B7280', // gray-500
]

export default function LabelsPage() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [editingLabel, setEditingLabel] = useState<LabelType | null>(null)
    const [formData, setFormData] = useState<Omit<NewLabel, 'createdBy'>>({
        name: '',
        color: COLOR_OPTIONS[0],
        description: '',
    })

    const { data: labels, isLoading } = useLabels()
    const createLabelMutation = useCreateLabel()
    const updateLabelMutation = useUpdateLabel()
    const deleteLabelMutation = useDeleteLabel()

    // 폼 리셋
    const resetForm = () => {
        setFormData({
            name: '',
            color: COLOR_OPTIONS[0],
            description: '',
        })
        setEditingLabel(null)
    }

    // 생성/수정 핸들러
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!formData.name.trim()) {
            return
        }

        try {
            if (editingLabel) {
            await updateLabelMutation.mutateAsync({
                id: editingLabel.id,
                updates: formData,
            })
        } else {
            await createLabelMutation.mutateAsync(formData)
        }
            
            setIsCreateDialogOpen(false)
            resetForm()
        } catch (error) {
            console.error('라벨 저장 실패:', error)
        }
    }

    // 수정 시작 핸들러
    const handleEdit = (label: LabelType) => {
        setEditingLabel(label)
        setFormData({
            name: label.name,
            color: label.color,
            description: label.description || '',
        })
        setIsCreateDialogOpen(true)
    }

    // 삭제 핸들러
    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`'${name}' 라벨을 삭제하시겠습니까? 관련된 고객의 라벨도 함께 제거됩니다.`)) {
            return
        }

        try {
            await deleteLabelMutation.mutateAsync(id)
        } catch (error) {
            console.error('라벨 삭제 실패:', error)
        }
    }

    // 다이얼로그 닫기 핸들러
    const handleDialogClose = () => {
        setIsCreateDialogOpen(false)
        resetForm()
    }

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* 헤더 */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">라벨 관리</h2>
                    <p className="text-muted-foreground">고객에게 부여할 가변적 라벨을 관리합니다.</p>
                </div>
                
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            라벨 생성
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {editingLabel ? '라벨 수정' : '새 라벨 생성'}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <UiLabel htmlFor="name">라벨 이름 *</UiLabel>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="라벨 이름을 입력하세요"
                                    required
                                />
                            </div>
                            
                            <div>
                                <UiLabel>색상</UiLabel>
                                <div className="grid grid-cols-7 gap-2 mt-2">
                                    {COLOR_OPTIONS.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, color }))}
                                            className={cn(
                                                'w-8 h-8 rounded-md border-2 transition-all',
                                                formData.color === color 
                                                    ? 'border-foreground scale-110' 
                                                    : 'border-border hover:border-muted-foreground'
                                            )}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <UiLabel htmlFor="description">설명 (선택사항)</UiLabel>
                                <Textarea
                                    id="description"
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="라벨에 대한 설명을 입력하세요"
                                    rows={3}
                                />
                            </div>
                            
                            <div className="flex gap-2 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={handleDialogClose}
                                >
                                    취소
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1"
                                    disabled={createLabelMutation.isPending || updateLabelMutation.isPending}
                                >
                                    {createLabelMutation.isPending || updateLabelMutation.isPending ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                                    ) : null}
                                    {editingLabel ? '수정' : '생성'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* 라벨 목록 */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {labels?.map((label) => (
                    <Card key={label.id} className="relative">
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                    <div 
                                        className="w-4 h-4 rounded-full"
                                        style={{ backgroundColor: label.color }}
                                    />
                                    <CardTitle className="text-base">{label.name}</CardTitle>
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEdit(label)}
                                        className="h-8 w-8 p-0"
                                    >
                                        <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(label.id, label.name)}
                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {label.description && (
                                <p className="text-sm text-muted-foreground">
                                    {label.description}
                                </p>
                            )}
                            <div className="mt-3">
                                <Badge 
                                    variant="secondary" 
                                    className="text-xs"
                                    style={{ 
                                        backgroundColor: `${label.color}20`, 
                                        color: label.color,
                                        borderColor: label.color 
                                    }}
                                >
                                    <Tag className="h-3 w-3 mr-1" />
                                    {label.name}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                
                {labels?.length === 0 && (
                    <div className="col-span-full text-center py-12">
                        <div className="text-muted-foreground">
                            <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">생성된 라벨이 없습니다</p>
                            <p className="text-sm mt-1">첫 번째 라벨을 생성해보세요.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}