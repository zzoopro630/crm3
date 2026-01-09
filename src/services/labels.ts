import { createSupabaseClient } from '@/utils/supabase'
import type { Label, NewLabel, CustomerLabel, NewCustomerLabel } from '@/db/schema'

// ============ 라벨 관리 ============

// 라벨 목록 조회
export async function getLabels(): Promise<Label[]> {
    const supabase = createSupabaseClient()
    const { data, error } = await supabase
        .from('labels')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) throw new Error(`라벨 목록 조회 실패: ${error.message}`)
    return data as Label[]
}

// 라벨 생성
export async function createLabel(label: NewLabel): Promise<Label> {
    const supabase = createSupabaseClient()
    const { data, error } = await supabase
        .from('labels')
        .insert(label)
        .select()
        .single()

    if (error) throw new Error(`라벨 생성 실패: ${error.message}`)
    return data as Label
}

// 라벨 수정
export async function updateLabel(id: string, updates: Partial<NewLabel>): Promise<Label> {
    const supabase = createSupabaseClient()
    const { data, error } = await supabase
        .from('labels')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

    if (error) throw new Error(`라벨 수정 실패: ${error.message}`)
    return data as Label
}

// 라벨 삭제
export async function deleteLabel(id: string): Promise<void> {
    const supabase = createSupabaseClient()
    
    // 먼저 관련된 고객-라벨 연결 삭제
    await supabase
        .from('customer_labels')
        .delete()
        .eq('label_id', id)
    
    // 라벨 삭제
    const { error } = await supabase
        .from('labels')
        .delete()
        .eq('id', id)

    if (error) throw new Error(`라벨 삭제 실패: ${error.message}`)
}

// ============ 고객 라벨 관리 ============

// 고객의 라벨 목록 조회
export async function getCustomerLabels(customerId: number): Promise<Label[]> {
    const supabase = createSupabaseClient()
    const { data, error } = await supabase
        .from('customer_labels')
        .select(`
            labels (
                id,
                name,
                color,
                description,
                created_at
            )
        `)
        .eq('customer_id', customerId)

    if (error) throw new Error(`고객 라벨 조회 실패: ${error.message}`)
    return data?.map((item: any) => item.labels).filter(Boolean) as Label[]
}

// 고객에 라벨 추가
export async function addCustomerLabel(customerId: number, labelId: string, createdBy: string): Promise<CustomerLabel> {
    const supabase = createSupabaseClient()
    const customerLabel: NewCustomerLabel = {
        customerId,
        labelId,
        createdBy,
    }
    
    const { data, error } = await supabase
        .from('customer_labels')
        .insert(customerLabel)
        .select()
        .single()

    if (error) throw new Error(`고객 라벨 추가 실패: ${error.message}`)
    return data as CustomerLabel
}

// 고객에서 라벨 제거
export async function removeCustomerLabel(customerId: number, labelId: string): Promise<void> {
    const supabase = createSupabaseClient()
    const { error } = await supabase
        .from('customer_labels')
        .delete()
        .eq('customer_id', customerId)
        .eq('label_id', labelId)

    if (error) throw new Error(`고객 라벨 제거 실패: ${error.message}`)
}

// 고객 라벨 일괄 업데이트
export async function updateCustomerLabels(customerId: number, labelIds: string[], createdBy: string): Promise<void> {
    const supabase = createSupabaseClient()
    
    // 기존 라벨 모두 제거
    await supabase
        .from('customer_labels')
        .delete()
        .eq('customer_id', customerId)
    
    // 새로운 라벨 추가
    if (labelIds.length > 0) {
        const customerLabels: NewCustomerLabel[] = labelIds.map(labelId => ({
            customerId,
            labelId,
            createdBy,
        }))
        
        const { error } = await supabase
            .from('customer_labels')
            .insert(customerLabels)

        if (error) throw new Error(`고객 라벨 업데이트 실패: ${error.message}`)
    }
}