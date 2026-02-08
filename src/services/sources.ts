import { apiRequest } from '@/lib/apiClient'

// ============ Types ============

export interface Source {
    id: number
    name: string
    createdAt: string
}

export interface CreateSourceInput {
    name: string
}

// ============ Source Services ============

export async function getSources(): Promise<Source[]> {
    return apiRequest<Source[]>('/api/sources')
}

export async function createSource(input: CreateSourceInput): Promise<Source> {
    return apiRequest<Source>('/api/sources', {
        method: 'POST',
        body: JSON.stringify(input),
    })
}

export async function updateSource(id: number, name: string): Promise<Source> {
    return apiRequest<Source>(`/api/sources/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name }),
    })
}

export async function deleteSource(id: number): Promise<void> {
    await apiRequest(`/api/sources/${id}`, {
        method: 'DELETE',
    })
}
