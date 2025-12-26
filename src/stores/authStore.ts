import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/utils/supabase'
import type { Employee } from '@/types/employee'
import { getEmployeeByEmail, createPendingApproval } from '@/services/employees'

interface AuthState {
    user: User | null
    session: Session | null
    employee: Employee | null
    isLoading: boolean
    isAuthenticated: boolean
    isApproved: boolean // 사원 리스트에 등록된 사용자인지

    // Actions
    initialize: () => Promise<void>
    signInWithGoogle: () => Promise<void>
    signOut: () => Promise<void>
    checkEmployeeStatus: (email: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    session: null,
    employee: null,
    isLoading: true,
    isAuthenticated: false,
    isApproved: false,

    initialize: async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession()

            if (session?.user) {
                set({
                    user: session.user,
                    session,
                    isAuthenticated: true,
                })

                // Check if user is in employees table
                await get().checkEmployeeStatus(session.user.email || '')
            } else {
                set({
                    user: null,
                    session: null,
                    employee: null,
                    isAuthenticated: false,
                    isApproved: false,
                    isLoading: false,
                })
            }

            // Listen for auth changes
            supabase.auth.onAuthStateChange(async (_event, session) => {
                if (session?.user) {
                    set({
                        user: session.user,
                        session,
                        isAuthenticated: true,
                    })
                    await get().checkEmployeeStatus(session.user.email || '')
                } else {
                    set({
                        user: null,
                        session: null,
                        employee: null,
                        isAuthenticated: false,
                        isApproved: false,
                    })
                }
            })
        } catch (error) {
            console.error('Auth initialization error:', error)
            set({ isLoading: false })
        }
    },

    checkEmployeeStatus: async (email: string) => {
        try {
            const employee = await getEmployeeByEmail(email)

            if (employee) {
                set({
                    employee,
                    isApproved: true,
                    isLoading: false,
                })
            } else {
                // User not in employees table - create pending approval
                try {
                    await createPendingApproval(email)
                } catch (e) {
                    // Ignore if already exists
                }
                set({
                    employee: null,
                    isApproved: false,
                    isLoading: false,
                })
            }
        } catch (error) {
            console.error('Employee status check error:', error)
            set({
                employee: null,
                isApproved: false,
                isLoading: false,
            })
        }
    },

    signInWithGoogle: async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/`,
                },
            })
            if (error) throw error
        } catch (error) {
            console.error('Google sign in error:', error)
            throw error
        }
    },

    signOut: async () => {
        try {
            const { error } = await supabase.auth.signOut()
            if (error) throw error
            set({
                user: null,
                session: null,
                employee: null,
                isAuthenticated: false,
                isApproved: false,
            })
        } catch (error) {
            console.error('Sign out error:', error)
            throw error
        }
    },
}))
