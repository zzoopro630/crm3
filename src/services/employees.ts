import { supabase } from '@/utils/supabase'
import type { Employee, CreateEmployeeInput, UpdateEmployeeInput, PendingApproval } from '@/types/employee'

// ============ Helper Functions ============

// Convert camelCase to snake_case for database
function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const key in obj) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
        result[snakeKey] = obj[key]
    }
    return result
}

// Convert snake_case to camelCase for frontend
function toCamelCase<T>(obj: Record<string, unknown>): T {
    const result: Record<string, unknown> = {}
    for (const key in obj) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
        result[camelKey] = obj[key]
    }
    return result as T
}

function toCamelCaseArray<T>(arr: Record<string, unknown>[]): T[] {
    return arr.map(item => toCamelCase<T>(item))
}

// ============ Employee Services ============

export async function getEmployees(): Promise<Employee[]> {
    const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) throw error
    return toCamelCaseArray<Employee>(data || [])
}

export async function getEmployeeByEmail(email: string): Promise<Employee | null> {
    try {
        // is_active 조건 없이 먼저 시도
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('email', email)
            .single()

        if (error && error.code !== 'PGRST116') {
            console.error('getEmployeeByEmail error:', error)
            throw error
        }
        return data ? toCamelCase<Employee>(data) : null
    } catch (err) {
        console.error('getEmployeeByEmail failed:', err)
        return null
    }
}

export async function createEmployee(input: CreateEmployeeInput): Promise<Employee> {
    const dbInput = toSnakeCase(input as unknown as Record<string, unknown>)

    const { data, error } = await supabase
        .from('employees')
        .insert(dbInput)
        .select()
        .single()

    if (error) throw error
    return toCamelCase<Employee>(data)
}

export async function updateEmployee(id: string, input: UpdateEmployeeInput): Promise<Employee> {
    const dbInput = {
        ...toSnakeCase(input as unknown as Record<string, unknown>),
        updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
        .from('employees')
        .update(dbInput)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return toCamelCase<Employee>(data)
}

export async function deleteEmployee(id: string): Promise<void> {
    const { error } = await supabase
        .from('employees')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)

    if (error) throw error
}

export async function restoreEmployee(id: string): Promise<Employee> {
    const { data, error } = await supabase
        .from('employees')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return toCamelCase<Employee>(data)
}

export async function bulkCreateEmployees(employees: CreateEmployeeInput[]): Promise<{ success: number; failed: number }> {
    let success = 0
    let failed = 0

    for (const input of employees) {
        try {
            await createEmployee(input)
            success++
        } catch (error) {
            console.error('Failed to create employee:', input.email, error)
            failed++
        }
    }

    return { success, failed }
}

// ============ Pending Approvals Services ============

export async function getPendingApprovals(): Promise<PendingApproval[]> {
    const { data, error } = await supabase
        .from('pending_approvals')
        .select('*')
        .eq('status', 'pending')
        .order('requested_at', { ascending: true })

    if (error) throw error
    return toCamelCaseArray<PendingApproval>(data || [])
}

export async function createPendingApproval(email: string): Promise<PendingApproval> {
    // Check if already exists
    const { data: existing } = await supabase
        .from('pending_approvals')
        .select('*')
        .eq('email', email)
        .eq('status', 'pending')
        .single()

    if (existing) return toCamelCase<PendingApproval>(existing)

    const { data, error } = await supabase
        .from('pending_approvals')
        .insert({ email })
        .select()
        .single()

    if (error) throw error
    return toCamelCase<PendingApproval>(data)
}

export async function approveUser(
    approvalId: string,
    employeeData: CreateEmployeeInput,
    approvedBy: string
): Promise<Employee> {
    // Create employee
    const employee = await createEmployee(employeeData)

    // Update approval status
    await supabase
        .from('pending_approvals')
        .update({
            status: 'approved',
            processed_by: approvedBy,
            processed_at: new Date().toISOString()
        })
        .eq('id', approvalId)

    return employee
}

export async function rejectUser(approvalId: string, rejectedBy: string): Promise<void> {
    const { error } = await supabase
        .from('pending_approvals')
        .update({
            status: 'rejected',
            processed_by: rejectedBy,
            processed_at: new Date().toISOString()
        })
        .eq('id', approvalId)

    if (error) throw error
}
