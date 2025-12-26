import { supabase } from '@/utils/supabase'

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

/**
 * 모든 소스 목록 조회
 */
export async function getSources(): Promise<Source[]> {
    const { data, error } = await supabase
        .from('sources')
        .select('*')
        .order('name', { ascending: true })

    if (error) throw error

    return (data || []).map(row => ({
        id: row.id,
        name: row.name,
        createdAt: row.created_at,
    }))
}

/**
 * 소스 생성
 */
export async function createSource(input: CreateSourceInput): Promise<Source> {
    const { data, error } = await supabase
        .from('sources')
        .insert({ name: input.name })
        .select()
        .single()

    if (error) throw error

    return {
        id: data.id,
        name: data.name,
        createdAt: data.created_at,
    }
}

/**
 * 소스 수정
 */
export async function updateSource(id: number, name: string): Promise<Source> {
    const { data, error } = await supabase
        .from('sources')
        .update({ name })
        .eq('id', id)
        .select()
        .single()

    if (error) throw error

    return {
        id: data.id,
        name: data.name,
        createdAt: data.created_at,
    }
}

/**
 * 소스 삭제
 */
export async function deleteSource(id: number): Promise<void> {
    const { error } = await supabase
        .from('sources')
        .delete()
        .eq('id', id)

    if (error) throw error
}
