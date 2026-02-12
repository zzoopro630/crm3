import { cn } from '@/lib/utils'
import { Building2, Tag, UserCog, Clock, ClipboardList, Cog, ShieldCheck } from 'lucide-react'
import { NavLink, Outlet, useLocation, Navigate } from 'react-router-dom'
import { useMenuRoles } from '@/hooks/useMenuRole'

interface SettingsTab {
    id: string
    label: string
    icon: React.ComponentType<{ className?: string }>
}

const settingsTabs: SettingsTab[] = [
    { id: 'organizations', label: '조직 관리', icon: Building2 },
    { id: 'labels', label: '라벨 관리', icon: Tag },
    { id: 'menu-permissions', label: '메뉴 권한', icon: ShieldCheck },
    { id: 'board-categories', label: '게시판 관리', icon: ClipboardList },
    { id: 'employees', label: '사원 관리', icon: UserCog },
    { id: 'approvals', label: '승인 대기', icon: Clock },
    { id: 'app-settings', label: '앱 설정', icon: Cog },
]

export function SettingsPage() {
    const location = useLocation()
    const { data: menuRoles } = useMenuRoles()

    // 메뉴 권한 기반 탭 필터링
    const visibleTabs = settingsTabs.filter((tab) => {
        if (!menuRoles) return true // 로딩 중에는 모두 표시
        const role = menuRoles[`/settings/${tab.id}`]
        return role !== undefined && role !== 'none'
    })

    // 현재 경로의 마지막 세그먼트 파싱
    const currentPath = location.pathname.split('/').pop() || ''

    // 현재 탭이 접근 불가한 경우 → 첫 번째 허용 탭으로 리다이렉트
    if (menuRoles) {
        const currentVisible = visibleTabs.find(tab => tab.id === currentPath)
        if (!currentVisible || location.pathname === '/settings') {
            const firstTab = visibleTabs[0]
            if (firstTab) {
                return <Navigate to={firstTab.id} replace />
            }
            return <Navigate to="/" replace />
        }
    }

    return (
        <div className="flex gap-6 min-h-[calc(100vh-8rem)]">
            {/* Left Sidebar - Tab Menu (데스크탑만 표시) */}
            <div className="hidden lg:block w-56 shrink-0">
                <div className="sticky top-6">
                    <nav className="space-y-1">
                        {visibleTabs.map((tab) => {
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
