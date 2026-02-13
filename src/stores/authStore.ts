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

// onAuthStateChange 구독 해제 함수 (중복 등록 방지)
let authSubscription: { unsubscribe: () => void } | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    session: null,
    employee: null,
    isLoading: true,
    isAuthenticated: false,
    isApproved: false,

    initialize: async () => {
        // 10초 타임아웃: getSession()이 행(hang)하면 로딩 해제
        const timeout = setTimeout(() => {
            if (get().isLoading) {
                console.warn('Auth initialization timeout (10s) - forcing loading complete')
                set({ isLoading: false })
            }
        }, 10000)

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

            // Listen for auth changes (이전 구독 해제 후 등록)
            if (authSubscription) authSubscription.unsubscribe();
            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                if (session?.user) {
                    set({
                        user: session.user,
                        session,
                        isAuthenticated: true,
                    })
                    get().checkEmployeeStatus(session.user.email || '')
                } else {
                    set({
                        user: null,
                        session: null,
                        employee: null,
                        isAuthenticated: false,
                        isApproved: false,
                    })
                }
            });
            authSubscription = subscription;
        } catch (error) {
            console.error('Auth initialization error:', error)
            set({ isLoading: false })
        } finally {
            clearTimeout(timeout)
        }
    },

    checkEmployeeStatus: async (email: string) => {
        // 최고관리자 폴백 (API 실패해도 로그인 허용)
        const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL || ''

        try {
            const employee = await getEmployeeByEmail(email)

            if (employee) {
                set({
                    employee,
                    isApproved: true,
                    isLoading: false,
                })
            } else if (email === SUPER_ADMIN_EMAIL) {
                // 최고관리자 폴백
                set({
                    employee: {
                        id: 'fallback-admin',
                        email: SUPER_ADMIN_EMAIL,
                        fullName: '최고관리자',
                        securityLevel: 'F1',
                        organizationId: null,
                        isActive: true,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    } as any,
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
            // 최고관리자는 에러 시에도 폴백
            if (email === SUPER_ADMIN_EMAIL) {
                set({
                    employee: {
                        id: 'fallback-admin',
                        email: SUPER_ADMIN_EMAIL,
                        fullName: '최고관리자',
                        securityLevel: 'F1',
                        organizationId: null,
                        isActive: true,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    } as any,
                    isApproved: true,
                    isLoading: false,
                })
            } else {
                set({
                    employee: null,
                    isApproved: false,
                    isLoading: false,
                })
            }
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
        // 상태를 먼저 클리어 (API 실패해도 로그아웃 보장)
        set({
            user: null,
            session: null,
            employee: null,
            isAuthenticated: false,
            isApproved: false,
        })
        try {
            await supabase.auth.signOut()
        } catch (error) {
            console.error('Sign out error:', error)
        }
    },
}))
