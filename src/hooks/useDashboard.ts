import { useQuery } from '@tanstack/react-query'
import { getDashboardStats } from '@/services/dashboard'
import { useAuthStore } from '@/stores/authStore'

export function useDashboardStats() {
    const user = useAuthStore((state) => state.user)
    const employee = useAuthStore((state) => state.employee)

    // F1(최고관리자)는 전체 데이터, 그 외는 본인 데이터만
    const isAdmin = employee?.securityLevel === 'F1'
    const managerId = isAdmin ? undefined : user?.id

    return useQuery({
        queryKey: ['dashboardStats', managerId],
        queryFn: () => getDashboardStats(managerId),
        enabled: !!user,
        staleTime: 1000 * 60 * 2, // 2분 캐시
    })
}
