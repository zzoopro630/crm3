import type {
    CustomerListParams,
    CustomerListResponse,
    CustomerWithManager,
    CreateCustomerInput,
    UpdateCustomerInput
} from '@/types/customer'

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

// ============ Customer Services ============

export async function getCustomers(params: CustomerListParams = {}): Promise<CustomerListResponse> {
    const {
        page = 1,
        limit = 20,
        filters = {},
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = params

    const searchParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
    })

    if (filters.search) searchParams.set('search', filters.search)
    if (filters.status) searchParams.set('status', filters.status)
    if (filters.managerId) searchParams.set('managerId', filters.managerId)

    return apiRequest<CustomerListResponse>(`/api/customers?${searchParams}`)
}

export async function getCustomerById(id: number): Promise<CustomerWithManager | null> {
    try {
        return await apiRequest<CustomerWithManager>(`/api/customers/${id}`)
    } catch (error) {
        if (error instanceof Error && error.message.includes('404')) {
            return null
        }
        throw error
    }
}

export async function createCustomer(
    input: CreateCustomerInput,
    managerId?: string
): Promise<CustomerWithManager> {
    return apiRequest<CustomerWithManager>('/api/customers', {
        method: 'POST',
        body: JSON.stringify({
            ...input,
            managerId: managerId || input.managerId,
        }),
    })
}

export async function updateCustomer(
    id: number,
    input: UpdateCustomerInput
): Promise<CustomerWithManager> {
    return apiRequest<CustomerWithManager>(`/api/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
    })
}

export async function deleteCustomer(id: number): Promise<void> {
    await apiRequest(`/api/customers/${id}`, {
        method: 'DELETE',
    })
}

export async function bulkCreateCustomers(
    customers: CreateCustomerInput[],
    managerId: string
): Promise<{ success: number; failed: number }> {
    // 개별 생성으로 처리 (bulk API는 추후 추가)
    let success = 0
    let failed = 0

    for (const customer of customers) {
        try {
            await createCustomer(customer, managerId)
            success++
        } catch {
            failed++
        }
    }

    return { success, failed }
}
