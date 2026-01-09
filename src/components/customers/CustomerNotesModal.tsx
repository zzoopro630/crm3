import { useState } from 'react'
import { useCustomerNotes, useCreateCustomerNote, useUpdateCustomerNote, useDeleteCustomerNote } from '@/hooks/useCustomerNotes'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageSquare, Plus, Edit2, Trash2, Send, X } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { CustomerWithManager } from '@/types/customer'

interface CustomerNotesModalProps {
    customer: CustomerWithManager
    isOpen: boolean
    onClose: () => void
}

export function CustomerNotesModal({ customer, isOpen, onClose }: CustomerNotesModalProps) {
    const [newNote, setNewNote] = useState('')
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editingContent, setEditingContent] = useState('')

    const { employee } = useAuthStore()
    const { data: notes, isLoading } = useCustomerNotes(customer.id)
    const createNoteMutation = useCreateCustomerNote()
    const updateNoteMutation = useUpdateCustomerNote()
    const deleteNoteMutation = useDeleteCustomerNote()

    // 메모 생성 핸들러
    const handleCreateNote = async () => {
        if (!newNote.trim()) return

        try {
            await createNoteMutation.mutateAsync({
                customerId: customer.id,
                content: newNote.trim(),
            })
            setNewNote('')
        } catch (error) {
            console.error('메모 생성 실패:', error)
            alert('메모 생성에 실패했습니다.')
        }
    }

    // 메모 수정 시작
    const handleStartEdit = (note: any) => {
        setEditingId(note.id)
        setEditingContent(note.content)
    }

    // 메모 수정 취소
    const handleCancelEdit = () => {
        setEditingId(null)
        setEditingContent('')
    }

    // 메모 수정 저장
    const handleSaveEdit = async () => {
        if (!editingId || !editingContent.trim()) return

        try {
            await updateNoteMutation.mutateAsync({
                id: editingId,
                content: editingContent.trim(),
            })
            handleCancelEdit()
        } catch (error) {
            console.error('메모 수정 실패:', error)
            alert('메모 수정에 실패했습니다.')
        }
    }

    // 메모 삭제
    const handleDeleteNote = async (noteId: number) => {
        if (!confirm('이 메모를 삭제하시겠습니까?')) return

        try {
            await deleteNoteMutation.mutateAsync({
                id: noteId,
                customerId: customer.id,
            })
        } catch (error) {
            console.error('메모 삭제 실패:', error)
            alert('메모 삭제에 실패했습니다.')
        }
    }

    // 메모 작성 권한 체크
    const canCreateNotes = employee?.securityLevel ? ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'].includes(employee.securityLevel) : false

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        {customer.name}님 메모 기록
                    </DialogTitle>
                </DialogHeader>

                {/* 메모 입력 영역 */}
                {canCreateNotes && (
                    <div className="flex gap-2 pb-4 border-b">
                        <Input
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="새 메모를 입력하세요..."
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.ctrlKey) {
                                    handleCreateNote()
                                }
                            }}
                            className="flex-1"
                        />
                        <Button 
                            onClick={handleCreateNote}
                            disabled={!newNote.trim() || createNoteMutation.isPending}
                            size="sm"
                        >
                            {createNoteMutation.isPending ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                )}

                {/* 메모 목록 */}
                <ScrollArea className="flex-1">
                    <div className="space-y-3 pr-4">
                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            </div>
                        ) : notes && notes.length > 0 ? (
                            notes.map((note) => (
                                <div key={note.id} className="bg-muted/30 rounded-lg p-3 space-y-2">
                                    {/* 메모 헤더 */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm">
                                                {note.employees?.fullName || '알 수 없음'}
                                            </span>
                                            <Badge variant="secondary" className="text-xs">
                                                {format(new Date(note.createdAt), 'MM/dd HH:mm', { locale: ko })}
                                            </Badge>
                                        </div>
                                        
                                        {/* 작업 버튼 */}
                                        <div className="flex gap-1">
                                            {note.createdBy === employee?.id && (
                                                <>
                                                    {editingId === note.id ? (
                                                        <div className="flex gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={handleSaveEdit}
                                                                disabled={updateNoteMutation.isPending}
                                                                className="h-6 w-6 p-0 text-green-600"
                                                            >
                                                                <Send className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={handleCancelEdit}
                                                                className="h-6 w-6 p-0 text-gray-600"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleStartEdit(note)}
                                                            className="h-6 w-6 p-0"
                                                        >
                                                            <Edit2 className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteNote(note.id)}
                                                        className="h-6 w-6 p-0 text-red-600"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* 메모 내용 */}
                                    {editingId === note.id ? (
                                        <Input
                                            value={editingContent}
                                            onChange={(e) => setEditingContent(e.target.value)}
                                            placeholder="메모 내용..."
                                            className="text-sm"
                                            autoFocus
                                        />
                                    ) : (
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                            {note.content}
                                        </p>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>등록된 메모가 없습니다</p>
                                <p className="text-sm">첫 번째 메모를 추가해보세요.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* 푸터 */}
                <div className="flex justify-between items-center pt-4 border-t text-xs text-muted-foreground">
                    <span>Ctrl+Enter로 메모 전송</span>
                    <span>{notes?.length || 0}개의 메모</span>
                </div>
            </DialogContent>
        </Dialog>
    )
}