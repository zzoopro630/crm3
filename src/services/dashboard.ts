import { supabase } from '@/utils/supabase'

export interface DashboardStats {
    totalCustomers: number
    newCustomers: number
    contactedCustomers: number
    consultingCustomers: number
    closedCustomers: number
    recentCustomers: RecentCustomer[]
}

export interface RecentCustomer {
    id: number
    name: string
    status: string
    createdAt: string
    managerName: string | null
}

export async function getDashboardStats(managerId?: string): Promise<DashboardStats> {
    // 전체 고객 수 및 상태별 집계
    let query = supabase
        .from('customers')
        .select('id, status', { count: 'exact' })

    // 권한에 따른 필터링 (매니저 ID가 있으면 해당 매니저의 고객만)
    if (managerId) {
        query = query.eq('manager_id', managerId)
    }

    const { data: customers, count } = await query

    // 상태별 집계
    const statusCounts = {
        new: 0,
        contacted: 0,
        consulting: 0,
        closed: 0,
    }

    if (customers) {
        customers.forEach((customer) => {
            const status = customer.status as keyof typeof statusCounts
            if (status in statusCounts) {
                statusCounts[status]++
            }
        })
    }

    // 최근 등록된 고객 5명
    let recentQuery = supabase
        .from('customers')
        .select('id, name, status, created_at, manager_id')
        .order('created_at', { ascending: false })
        .limit(5)

    if (managerId) {
        recentQuery = recentQuery.eq('manager_id', managerId)
    }

    const { data: recentData } = await recentQuery

    // 담당자 정보 조회
    const managerIds = [...new Set((recentData || []).map(c => c.manager_id).filter(Boolean))]
    let managersMap: Record<string, string> = {}

    if (managerIds.length > 0) {
        const { data: managers } = await supabase
            .from('employees')
            .select('id, full_name')
            .in('id', managerIds)

        if (managers) {
            managersMap = Object.fromEntries(managers.map(m => [m.id, m.full_name]))
        }
    }

    const recentCustomers: RecentCustomer[] = (recentData || []).map((row) => ({
        id: row.id,
        name: row.name,
        status: row.status,
        createdAt: row.created_at,
        managerName: managersMap[row.manager_id] || null,
    }))

    return {
        totalCustomers: count || 0,
        newCustomers: statusCounts.new,
        contactedCustomers: statusCounts.contacted,
        consultingCustomers: statusCounts.consulting,
        closedCustomers: statusCounts.closed,
        recentCustomers,
    }
}
