import { supabase } from '@/utils/supabase'
import type {
    CustomerListParams,
    CustomerListResponse,
    CustomerWithManager,
    CreateCustomerInput,
    UpdateCustomerInput
} from '@/types/customer'

// ============ Helper Functions ============

function toCamelCase<T>(obj: Record<string, unknown>): T {
    const result: Record<string, unknown> = {}
    for (const key in obj) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
        result[camelKey] = obj[key]
    }
    return result as T
}

function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const key in obj) {
        if (obj[key] !== undefined) {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
            result[snakeKey] = obj[key]
        }
    }
    return result
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

    const offset = (page - 1) * limit

    // Build query - 조인 없이 단순 조회
    let query = supabase
        .from('customers')
        .select('*', { count: 'exact' })

    // Apply filters
    if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`)
    }
    if (filters.status) {
        query = query.eq('status', filters.status)
    }
    if (filters.managerId) {
        query = query.eq('manager_id', filters.managerId)
    }

    // Apply sorting
    const sortColumn = sortBy === 'createdAt' ? 'created_at' :
        sortBy === 'updatedAt' ? 'updated_at' :
            sortBy
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, count, error } = await query

    if (error) throw error

    // 담당자 ID 목록 수집
    const managerIds = [...new Set((data || []).map(c => c.manager_id).filter(Boolean))]

    // 담당자 정보 별도 조회
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

    const customers: CustomerWithManager[] = (data || []).map((row: Record<string, unknown>) => {
        const customer = toCamelCase<CustomerWithManager>(row)
        customer.managerName = managersMap[row.manager_id as string] || null
        return customer
    })

    return {
        data: customers,
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
    }
}

export async function getCustomerById(id: number): Promise<CustomerWithManager | null> {
    try {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', id)
            .single()

        if (error && error.code !== 'PGRST116') throw error
        if (!data) return null

        const customer = toCamelCase<CustomerWithManager>(data)

        // 담당자 이름 별도 조회
        if (data.manager_id) {
            const { data: manager } = await supabase
                .from('employees')
                .select('full_name')
                .eq('id', data.manager_id)
                .single()
            customer.managerName = manager?.full_name || null
        } else {
            customer.managerName = null
        }

        return customer
    } catch (err) {
        console.error('getCustomerById error:', err)
        throw err
    }
}

export async function createCustomer(
    input: CreateCustomerInput,
    managerId: string
): Promise<CustomerWithManager> {
    const dbInput = {
        ...toSnakeCase(input as unknown as Record<string, unknown>),
        manager_id: managerId,
    }

    const { data, error } = await supabase
        .from('customers')
        .insert(dbInput)
        .select('*')
        .single()

    if (error) throw error

    const customer = toCamelCase<CustomerWithManager>(data)

    // 담당자 이름 별도 조회
    const { data: manager } = await supabase
        .from('employees')
        .select('full_name')
        .eq('id', managerId)
        .single()
    customer.managerName = manager?.full_name || null

    return customer
}

export async function updateCustomer(
    id: number,
    input: UpdateCustomerInput
): Promise<CustomerWithManager> {
    const dbInput = {
        ...toSnakeCase(input as unknown as Record<string, unknown>),
        updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
        .from('customers')
        .update(dbInput)
        .eq('id', id)
        .select('*')
        .single()

    if (error) throw error

    const customer = toCamelCase<CustomerWithManager>(data)

    // 담당자 이름 별도 조회
    if (data.manager_id) {
        const { data: manager } = await supabase
            .from('employees')
            .select('full_name')
            .eq('id', data.manager_id)
            .single()
        customer.managerName = manager?.full_name || null
    } else {
        customer.managerName = null
    }

    return customer
}

export async function deleteCustomer(id: number): Promise<void> {
    const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)

    if (error) throw error
}

export async function bulkCreateCustomers(
    customers: CreateCustomerInput[],
    managerId: string
): Promise<{ success: number; failed: number }> {
    const dbInputs = customers.map(input => ({
        ...toSnakeCase(input as unknown as Record<string, unknown>),
        manager_id: managerId,
    }))

    const { data, error } = await supabase
        .from('customers')
        .insert(dbInputs)
        .select()

    if (error) throw error

    return {
        success: data?.length || 0,
        failed: customers.length - (data?.length || 0),
    }
}
