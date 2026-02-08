import type { CustomerNote, NewCustomerNote } from '@/db/schema'
import { apiRequest } from '@/lib/apiClient'

export interface CustomerNoteWithAuthor extends CustomerNote {
    authorName?: string
}

// ============ Note Services ============

// 특정 고객의 메모 목록 조회
export async function getCustomerNotes(customerId: number): Promise<CustomerNoteWithAuthor[]> {
    return apiRequest<CustomerNoteWithAuthor[]>(`/api/notes/${customerId}`)
}

// 메모 생성
export async function createCustomerNote(
    input: Omit<NewCustomerNote, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CustomerNote> {
    return apiRequest<CustomerNote>('/api/notes', {
        method: 'POST',
        body: JSON.stringify(input),
    })
}

// 메모 수정
export async function updateCustomerNote(
    id: number,
    content: string
): Promise<CustomerNote> {
    return apiRequest<CustomerNote>(`/api/notes/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ content }),
    })
}

// 메모 삭제
export async function deleteCustomerNote(id: number): Promise<void> {
    await apiRequest(`/api/notes/${id}`, {
        method: 'DELETE',
    })
}
