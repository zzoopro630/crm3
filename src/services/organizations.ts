import { supabase } from '@/utils/supabase'

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

// ============ Helper Functions ============

function toCamelCase<T>(obj: Record<string, unknown>): T {
    const result: Record<string, unknown> = {}
    for (const key in obj) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
        result[camelKey] = obj[key]
    }
    return result as T
}

// ============ Organization Services ============

/**
 * 모든 조직 목록 조회
 */
export async function getOrganizations(): Promise<Organization[]> {
    const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name', { ascending: true })

    if (error) throw error

    // 매니저 이름 별도 조회
    const managerIds = [...new Set((data || []).map(o => o.manager_id).filter(Boolean))]
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

    return (data || []).map(row => {
        const org = toCamelCase<Organization>(row)
        org.managerName = row.manager_id ? managersMap[row.manager_id] || null : null
        return org
    })
}

/**
 * 단일 조직 조회
 */
export async function getOrganizationById(id: number): Promise<Organization | null> {
    const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single()

    if (error && error.code !== 'PGRST116') throw error
    if (!data) return null

    const org = toCamelCase<Organization>(data)

    if (data.manager_id) {
        const { data: manager } = await supabase
            .from('employees')
            .select('full_name')
            .eq('id', data.manager_id)
            .single()
        org.managerName = manager?.full_name || null
    }

    return org
}

/**
 * 조직 생성
 */
export async function createOrganization(input: CreateOrganizationInput): Promise<Organization> {
    const dbInput = {
        name: input.name,
        parent_id: input.parentId || null,
        manager_id: input.managerId || null,
    }

    const { data, error } = await supabase
        .from('organizations')
        .insert(dbInput)
        .select()
        .single()

    if (error) throw error

    return toCamelCase<Organization>(data)
}

/**
 * 조직 수정
 */
export async function updateOrganization(id: number, input: UpdateOrganizationInput): Promise<Organization> {
    const dbInput: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    }

    if (input.name !== undefined) dbInput.name = input.name
    if (input.parentId !== undefined) dbInput.parent_id = input.parentId
    if (input.managerId !== undefined) dbInput.manager_id = input.managerId

    const { data, error } = await supabase
        .from('organizations')
        .update(dbInput)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error

    return toCamelCase<Organization>(data)
}

/**
 * 조직 삭제
 */
export async function deleteOrganization(id: number): Promise<void> {
    const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id)

    if (error) throw error
}

/**
 * 조직 트리 구조로 변환
 */
export function buildOrganizationTree(organizations: Organization[]): (Organization & { children: Organization[] })[] {
    const map = new Map<number, Organization & { children: Organization[] }>()
    const roots: (Organization & { children: Organization[] })[] = []

    // 모든 조직을 맵에 추가
    organizations.forEach(org => {
        map.set(org.id, { ...org, children: [] })
    })

    // 부모-자식 관계 설정
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
