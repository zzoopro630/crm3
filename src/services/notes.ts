import type { CustomerNote, NewCustomerNote } from '@/db/schema'

export interface CustomerNoteWithAuthor extends CustomerNote {
    authorName?: string
}

// ============ API Helper ============

async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
        ...options,
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
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
