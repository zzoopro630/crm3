import { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
    children: React.ReactNode
    requireApproval?: boolean // true면 승인된 사용자만 접근 가능
}

const LOADING_TIMEOUT_MS = 15000 // 15초

export function ProtectedRoute({ children, requireApproval = true }: ProtectedRouteProps) {
    const { isAuthenticated, isApproved, isLoading } = useAuthStore()
    const location = useLocation()
    const [timedOut, setTimedOut] = useState(false)

    // 로딩이 15초 이상 지속되면 타임아웃 처리
    useEffect(() => {
        if (!isLoading) {
            setTimedOut(false)
            return
        }
        const timer = setTimeout(() => setTimedOut(true), LOADING_TIMEOUT_MS)
        return () => clearTimeout(timer)
    }, [isLoading])

    if (isLoading && !timedOut) {
        return (
            <div className="flex h-screen items-center justify-center bg-zinc-100 dark:bg-zinc-950">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    // 타임아웃: 로그인 페이지로 보내고 새로고침 유도
    if (isLoading && timedOut) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-4 bg-zinc-100 dark:bg-zinc-950">
                <p className="text-sm text-muted-foreground">
                    페이지 로딩에 시간이 걸리고 있습니다.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-white hover:bg-primary/90"
                >
                    새로고침
                </button>
            </div>
        )
    }

    // 로그인 안 됨 -> 로그인 페이지로
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    // 로그인은 됐지만 승인 안 됨 -> 승인 대기 페이지로
    if (requireApproval && !isApproved) {
        return <Navigate to="/access-denied" replace />
    }

    return <>{children}</>
}
