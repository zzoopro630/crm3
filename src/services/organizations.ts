import { apiRequest } from '@/lib/apiClient'

// ============ Types ============

export interface Organization {
    id: number
    name: string
    parentId: number | null
    managerId: string | null
    managerName?: string | null
    createdAt: string
    updatedAt: string
}

export interface CreateOrganizationInput {
    name: string
    parentId?: number | null
    managerId?: string | null
}

export interface UpdateOrganizationInput {
    name?: string
    parentId?: number | null
    managerId?: string | null
}

// ============ Organization Services ============

export async function getOrganizations(): Promise<Organization[]> {
    return apiRequest<Organization[]>('/api/organizations')
}

export async function getOrganizationById(id: number): Promise<Organization | null> {
    try {
        return await apiRequest<Organization>(`/api/organizations/${id}`)
    } catch (error) {
        if (error instanceof Error && error.message.includes('404')) {
            return null
        }
        throw error
    }
}

export async function createOrganization(input: CreateOrganizationInput): Promise<Organization> {
    return apiRequest<Organization>('/api/organizations', {
        method: 'POST',
        body: JSON.stringify(input),
    })
}

export async function updateOrganization(id: number, input: UpdateOrganizationInput): Promise<Organization> {
    return apiRequest<Organization>(`/api/organizations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
    })
}

export async function deleteOrganization(id: number): Promise<void> {
    await apiRequest(`/api/organizations/${id}`, {
        method: 'DELETE',
    })
}

/**
 * 조직 트리 구조로 변환 (클라이언트에서 처리)
 */
export function buildOrganizationTree(organizations: Organization[]): (Organization & { children: Organization[] })[] {
    const map = new Map<number, Organization & { children: Organization[] }>()
    const roots: (Organization & { children: Organization[] })[] = []

    organizations.forEach(org => {
        map.set(org.id, { ...org, children: [] })
    })

    organizations.forEach(org => {
        const node = map.get(org.id)!
        if (org.parentId && map.has(org.parentId)) {
            map.get(org.parentId)!.children.push(node)
        } else {
            roots.push(node)
        }
    })

    return roots
}
