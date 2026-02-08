import type { Contract, NewContract } from '@/db/schema'
import { apiRequest } from '@/lib/apiClient'

export interface ContractWithAuthor extends Contract {
    authorName?: string
}

// ============ Contract Services ============

// 특정 고객의 계약 목록 조회
export async function getCustomerContracts(customerId: number): Promise<ContractWithAuthor[]> {
    return apiRequest<ContractWithAuthor[]>(`/api/contracts/${customerId}`)
}

// 계약 생성
export async function createContract(
    input: Omit<NewContract, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Contract> {
    return apiRequest<Contract>('/api/contracts', {
        method: 'POST',
        body: JSON.stringify(input),
    })
}

// 계약 수정
export async function updateContract(
    id: number,
    input: Partial<Pick<Contract, 'insuranceCompany' | 'productName' | 'premium' | 'paymentPeriod' | 'memo'>>
): Promise<Contract> {
    return apiRequest<Contract>(`/api/contracts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
    })
}

// 계약 삭제
export async function deleteContract(id: number): Promise<void> {
    await apiRequest(`/api/contracts/${id}`, {
        method: 'DELETE',
    })
}
