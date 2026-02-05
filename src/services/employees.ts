import type { Employee, CreateEmployeeInput, UpdateEmployeeInput, PendingApproval } from '@/types/employee'

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

// ============ Employee Services ============

export async function getEmployees(): Promise<Employee[]> {
    return apiRequest<Employee[]>('/api/employees')
}

export async function getEmployeeByEmail(email: string): Promise<Employee | null> {
    try {
        return await apiRequest<Employee>(`/api/employees/email/${encodeURIComponent(email)}`)
    } catch (error) {
        if (error instanceof Error && error.message.includes('404')) {
            return null
        }
        console.error('getEmployeeByEmail failed:', error)
        return null
    }
}

export async function createEmployee(input: CreateEmployeeInput): Promise<Employee> {
    return apiRequest<Employee>('/api/employees', {
        method: 'POST',
        body: JSON.stringify(input),
    })
}

export async function updateEmployee(id: string, input: UpdateEmployeeInput): Promise<Employee> {
    return apiRequest<Employee>(`/api/employees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
    })
}

export async function deleteEmployee(id: string): Promise<void> {
    await apiRequest(`/api/employees/${id}`, {
        method: 'DELETE',
    })
}

export async function restoreEmployee(id: string): Promise<Employee> {
    return apiRequest<Employee>(`/api/employees/${id}/restore`, {
        method: 'PUT',
    })
}

export async function permanentDeleteEmployee(id: string): Promise<void> {
    await apiRequest(`/api/employees/${id}/permanent`, {
        method: 'DELETE',
    })
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
    return apiRequest<PendingApproval[]>('/api/pending-approvals')
}

export async function createPendingApproval(email: string): Promise<PendingApproval> {
    return apiRequest<PendingApproval>('/api/pending-approvals', {
        method: 'POST',
        body: JSON.stringify({ email }),
    })
}

export async function approveUser(
    approvalId: string,
    employeeData: CreateEmployeeInput,
    approvedBy: string
): Promise<Employee> {
    return apiRequest<Employee>(`/api/pending-approvals/${approvalId}/approve`, {
        method: 'PUT',
        body: JSON.stringify({
            ...employeeData,
            employeeId: approvalId,
            approvedBy,
        }),
    })
}

export async function rejectUser(approvalId: string, rejectedBy: string): Promise<void> {
    await apiRequest(`/api/pending-approvals/${approvalId}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ rejectedBy }),
    })
}
