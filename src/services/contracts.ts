import { supabase } from '@/utils/supabase'
import type { Contract, NewContract } from '@/db/schema'

export interface ContractWithAuthor extends Contract {
    authorName?: string
}

// 특정 고객의 계약 목록 조회
export async function getCustomerContracts(customerId: number): Promise<ContractWithAuthor[]> {
    const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching customer contracts:', error)
        throw error
    }

    // snake_case → camelCase 변환
    return (data || []).map(contract => ({
        id: contract.id,
        customerId: contract.customer_id,
        insuranceCompany: contract.insurance_company,
        productName: contract.product_name,
        premium: contract.premium,
        paymentPeriod: contract.payment_period,
        memo: contract.memo,
        createdBy: contract.created_by,
        createdAt: contract.created_at,
        updatedAt: contract.updated_at,
        authorName: '작성자',
    }))
}

// 계약 생성
export async function createContract(
    input: Omit<NewContract, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Contract> {
    const { data, error } = await supabase
        .from('contracts')
        .insert({
            customer_id: input.customerId,
            insurance_company: input.insuranceCompany,
            product_name: input.productName,
            premium: input.premium,
            payment_period: input.paymentPeriod,
            memo: input.memo,
            created_by: input.createdBy,
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating contract:', error)
        throw error
    }

    return data
}

// 계약 수정
export async function updateContract(
    id: number,
    input: Partial<Pick<Contract, 'insuranceCompany' | 'productName' | 'premium' | 'paymentPeriod' | 'memo'>>
): Promise<Contract> {
    const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    }

    if (input.insuranceCompany !== undefined) updateData.insurance_company = input.insuranceCompany
    if (input.productName !== undefined) updateData.product_name = input.productName
    if (input.premium !== undefined) updateData.premium = input.premium
    if (input.paymentPeriod !== undefined) updateData.payment_period = input.paymentPeriod
    if (input.memo !== undefined) updateData.memo = input.memo

    const { data, error } = await supabase
        .from('contracts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

    if (error) {
        console.error('Error updating contract:', error)
        throw error
    }

    return data
}

// 계약 삭제
export async function deleteContract(id: number): Promise<void> {
    const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting contract:', error)
        throw error
    }
}
