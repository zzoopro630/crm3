import { useState, useEffect, useCallback } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Breadcrumb } from './Breadcrumb'
import { cn } from '@/lib/utils'
import { useSessionTimeout } from '@/hooks/useSessionTimeout'

// 서브메뉴가 있는 경로 prefix 목록
const SUBMENU_PREFIXES = ['/settings', '/ads']

export function DashboardLayout() {
    useSessionTimeout()
    const location = useLocation()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    // 사용자가 수동으로 축소/확장을 설정했는지 여부
    const [manualCollapse, setManualCollapse] = useState<boolean | null>(null)

    // 현재 경로가 서브메뉴 영역인지 확인
    const isInSubmenuArea = SUBMENU_PREFIXES.some(
        prefix => location.pathname === prefix || location.pathname.startsWith(prefix + '/')
    )

    // 경로 변경 시 자동 축소/확장
    useEffect(() => {
        // 사용자가 수동으로 설정한 경우 해당 설정 유지
        if (manualCollapse !== null) {
            setSidebarCollapsed(manualCollapse)
            return
        }
        // 서브메뉴 영역 진입 시 자동 축소, 일반 메뉴 시 확장
        setSidebarCollapsed(isInSubmenuArea)
    }, [location.pathname, isInSubmenuArea, manualCollapse])

    // 일반 메뉴 클릭 시 수동 설정 초기화
    const handleNavigateToMainMenu = useCallback(() => {
        setManualCollapse(null)
    }, [])

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen)
    const toggleSidebarCollapse = () => {
        const newValue = !sidebarCollapsed
        setSidebarCollapsed(newValue)
        setManualCollapse(newValue)
    }

    return (
        <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950">
            <Sidebar
                isOpen={sidebarOpen}
                onToggle={toggleSidebar}
                isCollapsed={sidebarCollapsed}
                onCollapseToggle={toggleSidebarCollapse}
                onNavigateToMainMenu={handleNavigateToMainMenu}
            />

            {/* Main content area */}
            <div className={cn(
                'min-h-screen flex flex-col transition-all duration-300',
                sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
            )}>
                <Header onSidebarToggle={toggleSidebar} />

                {/* 모바일 브레드크럼 */}
                <div className="lg:hidden px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <Breadcrumb />
                </div>

                <main className="flex-1 p-4 md:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
