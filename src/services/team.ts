import type { Employee } from '@/types/employee'

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

// ============ Team Services ============

/**
 * 하위 조직원 목록 조회 (본인 포함)
 */
export async function getTeamMembers(employee: Employee): Promise<TeamMember[]> {
    return apiRequest<TeamMember[]>('/api/team/members', {
        method: 'POST',
        body: JSON.stringify({
            employeeId: employee.id,
            securityLevel: employee.securityLevel,
        }),
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
