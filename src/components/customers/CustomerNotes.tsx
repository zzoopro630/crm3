import { useState } from 'react'
import { useCustomerNotes, useCreateNote, useUpdateNote, useDeleteNote } from '@/hooks/useNotes'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
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

    return (
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-zinc-900 dark:text-white">메모</CardTitle>
                {!isAdding && (
                    <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
                        <Plus className="h-4 w-4 mr-1" />
                        메모 추가
                    </Button>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {/* 새 메모 입력 폼 */}
                {isAdding && (
                    <div className="space-y-2 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800">
                        <textarea
                            value={newContent}
                            onChange={(e) => setNewContent(e.target.value)}
                            placeholder="메모 내용을 입력하세요..."
                            className="w-full min-h-[80px] p-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white resize-none"
                            autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => { setIsAdding(false); setNewContent('') }}>
                                <X className="h-4 w-4 mr-1" />
                                취소
                            </Button>
                            <Button size="sm" onClick={handleAdd} disabled={createNote.isPending || !newContent.trim()}>
                                {createNote.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                                저장
                            </Button>
                        </div>
                    </div>
                )}

                {/* 메모 목록 */}
                {isLoading ? (
                    <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                    </div>
                ) : notes && notes.length > 0 ? (
                    <div className="space-y-3">
                        {notes.map((note) => (
                            <div
                                key={note.id}
                                className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700"
                            >
                                {editingId === note.id ? (
                                    <div className="space-y-2">
                                        <textarea
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            className="w-full min-h-[80px] p-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white resize-none"
                                            autoFocus
                                        />
                                        <div className="flex gap-2 justify-end">
                                            <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                                                <X className="h-4 w-4 mr-1" />
                                                취소
                                            </Button>
                                            <Button size="sm" onClick={() => handleUpdate(note.id)} disabled={updateNote.isPending}>
                                                {updateNote.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                                                저장
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-zinc-900 dark:text-white whitespace-pre-wrap">{note.content}</p>
                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                                            <span className="text-xs text-zinc-500">
                                                {note.authorName} · {note.createdAt ? new Date(note.createdAt).toLocaleString('ko-KR') : ''}
                                            </span>
                                            {employee?.id === note.createdBy && (
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="sm" onClick={() => startEdit(note.id, note.content)}>
                                                        <Pencil className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(note.id)}
                                                        className="text-red-500 hover:text-red-600"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-zinc-500 py-4">아직 메모가 없습니다.</p>
                )}
            </CardContent>
        </Card>
    )
}
