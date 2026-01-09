import { createClient } from '@/utils/supabase'
import type { CustomerNote, NewCustomerNote } from '@/db/schema'

// 고객 메모 목록 조회
export async function getCustomerNotes(customerId: number): Promise<CustomerNote[]> {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('customer_notes')
        .select(`
            *,
            employees:created_by (
                fullName
            )
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

    if (error) throw new Error(`메모 목록 조회 실패: ${error.message}`)
    return data as CustomerNote[]
}

// 고객 메모 생성
export async function createCustomerNote(note: NewCustomerNote): Promise<CustomerNote> {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('customer_notes')
        .insert(note)
        .select()
        .single()

    if (error) throw new Error(`메모 생성 실패: ${error.message}`)
    return data as CustomerNote
}

// 고객 메모 수정
export async function updateCustomerNote(id: number, content: string): Promise<CustomerNote> {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('customer_notes')
        .update({ 
            content, 
            updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single()

    if (error) throw new Error(`메모 수정 실패: ${error.message}`)
    return data as CustomerNote
}

// 고객 메모 삭제
export async function deleteCustomerNote(id: number): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
        .from('customer_notes')
        .delete()
        .eq('id', id)

    if (error) throw new Error(`메모 삭제 실패: ${error.message}`)
}