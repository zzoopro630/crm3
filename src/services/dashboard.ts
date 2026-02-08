import { apiRequest } from '@/lib/apiClient'

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

// ============ Dashboard Services ============

export async function getDashboardStats(managerId?: string): Promise<DashboardStats> {
    const params = new URLSearchParams()
    if (managerId) params.set('managerId', managerId)

    const url = params.toString() ? `/api/dashboard?${params}` : '/api/dashboard'
    return apiRequest<DashboardStats>(url)
}
