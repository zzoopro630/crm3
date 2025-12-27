import { supabase } from '@/utils/supabase'
import type { CustomerNote, NewCustomerNote } from '@/db/schema'

export interface CustomerNoteWithAuthor extends CustomerNote {
    authorName?: string
}

// 특정 고객의 메모 목록 조회
export async function getCustomerNotes(customerId: number): Promise<CustomerNoteWithAuthor[]> {
    const { data, error } = await supabase
        .from('customer_notes')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching customer notes:', error)
        throw error
    }

    // snake_case → camelCase 변환
    return (data || []).map(note => ({
        id: note.id,
        customerId: note.customer_id,
        content: note.content,
        createdBy: note.created_by,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
        authorName: '작성자',
    }))
}

// 메모 생성
export async function createCustomerNote(
    input: Omit<NewCustomerNote, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CustomerNote> {
    const { data, error } = await supabase
        .from('customer_notes')
        .insert({
            customer_id: input.customerId,
            content: input.content,
            created_by: input.createdBy,
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating customer note:', error)
        throw error
    }

    return data
}

// 메모 수정
export async function updateCustomerNote(
    id: number,
    content: string
): Promise<CustomerNote> {
    const { data, error } = await supabase
        .from('customer_notes')
        .update({
            content,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

    if (error) {
        console.error('Error updating customer note:', error)
        throw error
    }

    return data
}

// 메모 삭제
export async function deleteCustomerNote(id: number): Promise<void> {
    const { error } = await supabase
        .from('customer_notes')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting customer note:', error)
        throw error
    }
}
