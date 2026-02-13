import type { Employee } from '@/types/employee'
import { apiRequest } from '@/lib/apiClient'

// ============ Types ============

export interface TeamMember extends Employee {
    customerCount: number
    customersByStatus: {
        new: number
        contacted: number
        consulting: number
        closed: number
    }
}

export interface TeamStats {
    totalCustomers: number
    byStatus: {
        new: number
        contacted: number
        consulting: number
        closed: number
    }
}

// ============ Team Services ============

/**
 * 하위 조직원 목록 조회 (본인 포함)
 */
export async function getTeamMembers(): Promise<TeamMember[]> {
    return apiRequest<TeamMember[]>('/api/team/members', {
        method: 'POST',
    })
}

/**
 * 팀 전체 통계 조회
 */
export async function getTeamStats(memberIds: string[]): Promise<TeamStats> {
    return apiRequest<TeamStats>('/api/team/stats', {
        method: 'POST',
        body: JSON.stringify({ memberIds }),
    })
}

/**
 * 고객 담당자 이관
 */
export async function transferCustomer(customerId: number, newManagerId: string): Promise<void> {
    await apiRequest(`/api/customers/${customerId}/transfer`, {
        method: 'PUT',
        body: JSON.stringify({ newManagerId }),
    })
}

/**
 * 대량 고객 이관
 */
export async function bulkTransferCustomers(
    customerIds: number[],
    newManagerId: string
): Promise<{ success: number; failed: number }> {
    let success = 0
    let failed = 0

    for (const id of customerIds) {
        try {
            await transferCustomer(id, newManagerId)
            success++
        } catch {
            failed++
        }
    }

    return { success, failed }
}
