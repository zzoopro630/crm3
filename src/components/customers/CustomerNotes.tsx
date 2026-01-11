import { useState } from 'react'
import { useCustomerNotes, useCreateNote, useUpdateNote, useDeleteNote } from '@/hooks/useNotes'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Plus, Pencil, Trash2, Save, X } from 'lucide-react'

interface CustomerNotesProps {
    customerId: number
}

export function CustomerNotes({ customerId }: CustomerNotesProps) {
    const { employee } = useAuthStore()
    const { data: notes, isLoading } = useCustomerNotes(customerId)
    const createNote = useCreateNote()
    const updateNote = useUpdateNote()
    const deleteNote = useDeleteNote()

    const [isAdding, setIsAdding] = useState(false)
    const [newContent, setNewContent] = useState('')
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editContent, setEditContent] = useState('')

    const handleAdd = async () => {
        if (!newContent.trim() || !employee?.id) return

        try {
            await createNote.mutateAsync({
                customerId,
                content: newContent.trim(),
                createdBy: employee.id,
            })
            setNewContent('')
            setIsAdding(false)
        } catch (error) {
            console.error('Failed to add note:', error)
        }
    }

    const handleUpdate = async (id: number) => {
        if (!editContent.trim()) return

        try {
            await updateNote.mutateAsync({ id, content: editContent.trim() })
            setEditingId(null)
            setEditContent('')
        } catch (error) {
            console.error('Failed to update note:', error)
        }
    }

    const handleDelete = async (id: number) => {
        if (!window.confirm('이 메모를 삭제하시겠습니까?')) return

        try {
            await deleteNote.mutateAsync(id)
        } catch (error) {
            console.error('Failed to delete note:', error)
        }
    }

    const startEdit = (id: number, content: string) => {
        setEditingId(id)
        setEditContent(content)
    }

    // Enter키로 저장
    const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault()
            action()
        }
    }

    return (
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-zinc-900 dark:text-white text-base">메모</CardTitle>
                {!isAdding && (
                    <Button variant="ghost" size="sm" onClick={() => setIsAdding(true)} className="h-7 px-2">
                        <Plus className="h-4 w-4" />
                    </Button>
                )}
            </CardHeader>
            <CardContent className="space-y-2">
                {/* 새 메모 입력 */}
                {isAdding && (
                    <div className="flex gap-2 items-center">
                        <Input
                            value={newContent}
                            onChange={(e) => setNewContent(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, handleAdd)}
                            placeholder="메모 입력 후 Enter..."
                            className="h-8 text-sm flex-1"
                            autoFocus
                        />
                        <Button size="sm" className="h-8" onClick={handleAdd} disabled={createNote.isPending || !newContent.trim()}>
                            {createNote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8" onClick={() => { setIsAdding(false); setNewContent('') }}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {/* 메모 목록 - 간단한 1줄 형식 */}
                {isLoading ? (
                    <div className="flex justify-center py-2">
                        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                    </div>
                ) : notes && notes.length > 0 ? (
                    <div className="space-y-1">
                        {notes.map((note) => (
                            <div
                                key={note.id}
                                className="group flex items-center gap-2 py-1.5 px-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm"
                            >
                                {editingId === note.id ? (
                                    <div className="flex gap-2 items-center flex-1">
                                        <Input
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, () => handleUpdate(note.id))}
                                            className="h-7 text-sm flex-1"
                                            autoFocus
                                        />
                                        <Button size="sm" className="h-7 px-2" onClick={() => handleUpdate(note.id)} disabled={updateNote.isPending}>
                                            {updateNote.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setEditingId(null)}>
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        {/* 날짜 */}
                                        <span className="text-xs text-zinc-400 whitespace-nowrap">
                                            {note.createdAt ? new Date(note.createdAt).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }).replace(/\. /g, '-').replace('.', '') : ''}
                                        </span>
                                        {/* 작성자 */}
                                        {note.authorName && (
                                            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium whitespace-nowrap">
                                                {note.authorName}
                                            </span>
                                        )}
                                        {/* 내용 */}
                                        <span className="flex-1 text-zinc-700 dark:text-zinc-300 truncate">
                                            {note.content}
                                        </span>
                                        {/* 액션 버튼 (hover시 표시) */}
                                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => startEdit(note.id, note.content)}>
                                                <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                                                onClick={() => handleDelete(note.id)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-zinc-400 py-2 text-sm">메모 없음</p>
                )}
            </CardContent>
        </Card>
    )
}
