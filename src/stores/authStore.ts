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
        // 안전장치: 10초 후에도 로딩 중이면 강제 해제 (OAuth 콜백 실패 대비)
        const timeout = setTimeout(() => {
            if (get().isLoading) {
                console.warn('Auth initialization timeout (10s) - forcing loading complete')
                set({ isLoading: false })
            }
        }, 10000)

        try {
            // 1. onAuthStateChange를 getSession보다 먼저 등록 (Supabase 공식 권장 패턴)
            //    → 이벤트 누락 방지
            if (authSubscription) authSubscription.unsubscribe();
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                if (session?.user) {
                    const prevUserId = get().user?.id
                    const isNewUser = prevUserId !== session.user.id

                    // 세션 정보는 항상 최신으로 갱신
                    set({
                        user: session.user,
                        session,
                        isAuthenticated: true,
                    })

                    // 새 사용자 로그인: 직원 확인 완료까지 로딩 유지
                    // → ProtectedRoute가 isApproved:false 상태에서 /access-denied로 보내는 것 방지
                    if (isNewUser) {
                        set({ isLoading: true, employee: null, isApproved: false })
                        get().checkEmployeeStatus(session.user.email || '')
                    }
                } else if (event === 'SIGNED_OUT') {
                    set({
                        user: null,
                        session: null,
                        employee: null,
                        isAuthenticated: false,
                        isApproved: false,
                        isLoading: false,
                    })
                }
            });
            authSubscription = subscription;

            // 2. 현재 세션 확인
            const { data: { session } } = await supabase.auth.getSession()

            if (session?.user) {
                set({
                    user: session.user,
                    session,
                    isAuthenticated: true,
                })
                await get().checkEmployeeStatus(session.user.email || '')
            } else {
                // OAuth 콜백 중(PKCE code 또는 hash token)이면 세션 도착까지 로딩 유지
                const isOAuthCallback =
                    window.location.hash.includes('access_token') ||
                    new URLSearchParams(window.location.search).has('code')

                if (!isOAuthCallback) {
                    set({
                        user: null,
                        session: null,
                        employee: null,
                        isAuthenticated: false,
                        isApproved: false,
                        isLoading: false,
                    })
                }
                // OAuth 콜백: isLoading 유지 → onAuthStateChange가 처리, timeout이 안전장치
            }
        } catch (error) {
            console.error('Auth initialization error:', error)
            set({ isLoading: false })
        } finally {
            // OAuth 콜백 대기 중이면 timeout 유지 (안전장치)
            if (!get().isLoading) {
                clearTimeout(timeout)
            }
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
