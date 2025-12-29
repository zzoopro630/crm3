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

// ============ Dashboard Services ============

export async function getDashboardStats(managerId?: string): Promise<DashboardStats> {
    const params = new URLSearchParams()
    if (managerId) params.set('managerId', managerId)

    const url = params.toString() ? `/api/dashboard?${params}` : '/api/dashboard'
    return apiRequest<DashboardStats>(url)
}
