import { supabase } from '@/utils/supabase'
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

// ============ Helper Functions ============

function toCamelCase<T>(obj: Record<string, unknown>): T {
    const result: Record<string, unknown> = {}
    for (const key in obj) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
        result[camelKey] = obj[key]
    }
    return result as T
}

// ============ Team Services ============

/**
 * 하위 조직원 목록 조회 (본인 포함)
 * F1: 전체 사원
 * F2~F5: 본인 + 하위 조직원
 * F6: 본인만
 */
export async function getTeamMembers(employee: Employee): Promise<TeamMember[]> {
    let employeeIds: string[] = [employee.id]

    if (employee.securityLevel === 'F1') {
        // F1은 전체 사원 조회
        const { data: allEmployees, error } = await supabase
            .from('employees')
            .select('*')
            .eq('is_active', true)
            .order('security_level', { ascending: true })

        if (error) throw error
        employeeIds = (allEmployees || []).map(e => e.id)
    } else if (['F2', 'F3', 'F4', 'F5'].includes(employee.securityLevel)) {
        // 하위 조직원 조회 (parent_id 기반 재귀 조회)
        // 간단 구현: 전체 사원 조회 후 필터링
        const { data: allEmployees, error } = await supabase
            .from('employees')
            .select('*')
            .eq('is_active', true)

        if (error) throw error

        // parent_id 기반 하위 조직원 찾기
        const findDescendants = (parentId: string, employees: Record<string, unknown>[]): string[] => {
            const children = employees.filter(e => e.parent_id === parentId)
            const childIds = children.map(c => c.id as string)
            const descendantIds = childIds.flatMap(id => findDescendants(id, employees))
            return [...childIds, ...descendantIds]
        }

        const descendantIds = findDescendants(employee.id, allEmployees || [])
        employeeIds = [employee.id, ...descendantIds]
    }

    // 각 사원의 고객 수 및 상태별 통계 조회
    const teamMembers: TeamMember[] = []

    for (const empId of employeeIds) {
        // 사원 정보 조회
        const { data: emp } = await supabase
            .from('employees')
            .select('*')
            .eq('id', empId)
            .single()

        if (!emp) continue

        // 해당 사원의 고객 통계 조회
        const { data: customers } = await supabase
            .from('customers')
            .select('status')
            .eq('manager_id', empId)

        const customersByStatus = {
            new: 0,
            contacted: 0,
            consulting: 0,
            closed: 0,
        }

            ; (customers || []).forEach(c => {
                const status = c.status as keyof typeof customersByStatus
                if (status in customersByStatus) {
                    customersByStatus[status]++
                }
            })

        teamMembers.push({
            ...toCamelCase<Employee>(emp),
            customerCount: customers?.length || 0,
            customersByStatus,
        })
    }

    return teamMembers
}

/**
 * 팀 전체 통계 조회
 */
export async function getTeamStats(memberIds: string[]): Promise<TeamStats> {
    const { data: customers, error } = await supabase
        .from('customers')
        .select('status')
        .in('manager_id', memberIds)

    if (error) throw error

    const byStatus = {
        new: 0,
        contacted: 0,
        consulting: 0,
        closed: 0,
    }

        ; (customers || []).forEach(c => {
            const status = c.status as keyof typeof byStatus
            if (status in byStatus) {
                byStatus[status]++
            }
        })

    return {
        totalCustomers: customers?.length || 0,
        byStatus,
    }
}

/**
 * 고객 담당자 이관
 */
export async function transferCustomer(customerId: number, newManagerId: string): Promise<void> {
    const { error } = await supabase
        .from('customers')
        .update({
            manager_id: newManagerId,
            updated_at: new Date().toISOString(),
        })
        .eq('id', customerId)

    if (error) throw error
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
