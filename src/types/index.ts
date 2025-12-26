import type { User, Session } from '@supabase/supabase-js'

export interface Profile {
    id: string
    email: string
    security_level: 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6'
    parent_id: string | null
    position_name: string | null
    full_name: string | null
    created_at: string
}

export interface AuthState {
    user: User | null
    session: Session | null
    profile: Profile | null
    isLoading: boolean
    isAuthenticated: boolean
}

export interface Customer {
    id: number
    manager_id: string
    name: string
    phone: string | null
    email: string | null
    address: string | null
    gender: '남성' | '여성' | '법인' | null
    birthdate: string | null
    company: string | null
    job_title: string | null
    source: string | null
    status: 'new' | 'contacted' | 'consulting' | 'closed'
    created_at: string
    updated_at: string
}
