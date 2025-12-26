import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
    children: React.ReactNode
    requireApproval?: boolean // true면 승인된 사용자만 접근 가능
}

export function ProtectedRoute({ children, requireApproval = true }: ProtectedRouteProps) {
    const { isAuthenticated, isApproved, isLoading } = useAuthStore()
    const location = useLocation()

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-zinc-100 dark:bg-zinc-950">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
