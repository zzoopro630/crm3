import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import { Building2, Tag, UserCog, Clock, Settings as SettingsIcon } from 'lucide-react'
import { NavLink, Outlet, useLocation, Navigate } from 'react-router-dom'

interface SettingsTab {
    id: string
    label: string
    icon: React.ComponentType<{ className?: string }>
    adminOnly?: boolean
}

const settingsTabs: SettingsTab[] = [
    { id: 'organizations', label: '조직 관리', icon: Building2, adminOnly: true },
    { id: 'labels', label: '라벨 관리', icon: Tag, adminOnly: true },
    { id: 'employees', label: '사원 관리', icon: UserCog, adminOnly: true },
    { id: 'approvals', label: '승인 대기', icon: Clock, adminOnly: true },
    { id: 'system', label: '시스템 설정', icon: SettingsIcon },
]

export function SettingsPage() {
    const { employee } = useAuthStore()
    const location = useLocation()

    // 관리자 권한 체크
    const isAdmin = employee?.securityLevel === 'F1'

    // 현재 경로의 마지막 세그먼트 파싱
    // /settings/organizations -> organizations
    const currentPath = location.pathname.split('/').pop() || ''

    // 현재 탭 정보 찾기
    const currentTab = settingsTabs.find(tab => tab.id === currentPath)

    // F1이 아닌 경우 처리
    if (!isAdmin) {
        // 관리자 전용 탭에 접근 시도 시, 또는 기본 리다이렉트(organizations)로 온 경우
        // 시스템 설정으로 리다이렉트
        if (currentTab?.adminOnly || location.pathname === '/settings' || currentPath === 'organizations') {
            return <Navigate to="system" replace />
        }

        // 그 외(system 등 허용된 탭)의 경우: 사이드바 없이 컨텐츠만 표시
        // 라우팅을 통해 Outlet에 SystemSettingsPage가 렌더링되겠지만,
        // 사이드바 없는 심플한 레이아웃을 위해 직접 렌더링 또는 Outlet만 렌더링
        return (
            <div className="space-y-6">
                <Outlet />
            </div>
        )
    }

    // 관리자(F1)인 경우: 사이드바 + Outlet 레이아웃
    return (
        <div className="flex gap-6 min-h-[calc(100vh-8rem)]">
            {/* Left Sidebar - Tab Menu */}
            <div className="w-56 shrink-0">
                <div className="sticky top-6">
                    <nav className="space-y-1">
                        {settingsTabs.map((tab) => {
                            const Icon = tab.icon
                            return (
                                <NavLink
                                    key={tab.id}
                                    to={tab.id}
                                    className={({ isActive }) => cn(
                                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left",
                                        isActive
                                            ? "bg-primary text-primary-foreground"
                                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    )}
                                >
                                    <Icon className="h-5 w-5" />
                                    {tab.label}
                                </NavLink>
                            )
                        })}
                    </nav>
                </div>
            </div>

            {/* Right Content */}
            <div className="flex-1 min-w-0">
                <Outlet />
            </div>
        </div>
    )
}
