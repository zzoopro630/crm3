import { useState, useEffect, useCallback, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Breadcrumb } from './Breadcrumb'
import { cn } from '@/lib/utils'
import { useSessionTimeout } from '@/hooks/useSessionTimeout'
import { useVersionCheck } from '@/hooks/useVersionCheck'
import { useAppConfig } from '@/hooks/useAppConfig'
import { usePostCleanup } from '@/hooks/usePostCleanup'

// 서브메뉴가 있는 경로 prefix 목록
const SUBMENU_PREFIXES = ['/settings', '/ads']

export function DashboardLayout() {
    const { sessionTimeoutMinutes, logoutCountdownSeconds } = useAppConfig()
    useSessionTimeout(sessionTimeoutMinutes)
    useVersionCheck()
    usePostCleanup()

    const location = useLocation()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    // 사용자가 수동으로 축소/확장을 설정했는지 여부
    const [manualCollapse, setManualCollapse] = useState<boolean | null>(null)

    // 화면 크기 감지: wide(xl, >=1280), medium(lg, 1024~1279), small(<1024)
    const [isWideScreen, setIsWideScreen] = useState(window.innerWidth >= 1280)

    // 왼쪽 가장자리 호버로 사이드바 열기 (마우스 환경 + 사이드바 숨김 상태)
    const [hasHover, setHasHover] = useState(false)
    const [isSmallScreen, setIsSmallScreen] = useState(false)

    useEffect(() => {
        const hoverMq = window.matchMedia('(hover: hover)')
        const screenMq = window.matchMedia('(max-width: 1023px)')
        const wideMq = window.matchMedia('(min-width: 1280px)')
        setHasHover(hoverMq.matches)
        setIsSmallScreen(screenMq.matches)
        setIsWideScreen(wideMq.matches)
        const onHoverChange = (e: MediaQueryListEvent) => setHasHover(e.matches)
        const onScreenChange = (e: MediaQueryListEvent) => setIsSmallScreen(e.matches)
        const onWideChange = (e: MediaQueryListEvent) => setIsWideScreen(e.matches)
        hoverMq.addEventListener('change', onHoverChange)
        screenMq.addEventListener('change', onScreenChange)
        wideMq.addEventListener('change', onWideChange)
        return () => {
            hoverMq.removeEventListener('change', onHoverChange)
            screenMq.removeEventListener('change', onScreenChange)
            wideMq.removeEventListener('change', onWideChange)
        }
    }, [])

    const showEdgeTrigger = hasHover && isSmallScreen && !sidebarOpen
    const openedByHoverRef = useRef(false)

    // 현재 경로가 서브메뉴 영역인지 확인
    const isInSubmenuArea = SUBMENU_PREFIXES.some(
        prefix => location.pathname === prefix || location.pathname.startsWith(prefix + '/')
    )

    // 경로 변경 시 자동 축소/확장
    useEffect(() => {
        // 넓은 화면(xl): 항상 펼침
        if (isWideScreen) {
            setSidebarCollapsed(false)
            return
        }
        // 사용자가 수동으로 설정한 경우 해당 설정 유지
        if (manualCollapse !== null) {
            setSidebarCollapsed(manualCollapse)
            return
        }
        // 중간 화면(lg~xl): 항상 축소
        setSidebarCollapsed(true)
    }, [location.pathname, isInSubmenuArea, manualCollapse, isWideScreen])

    // 일반 메뉴 클릭 시 수동 설정 초기화
    const handleNavigateToMainMenu = useCallback(() => {
        setManualCollapse(null)
    }, [])

    const toggleSidebar = () => {
        if (sidebarOpen) openedByHoverRef.current = false
        setSidebarOpen(!sidebarOpen)
    }
    const toggleSidebarCollapse = () => {
        // 넓은 화면에서는 축소 토글 불가
        if (isWideScreen) return
        const newValue = !sidebarCollapsed
        setSidebarCollapsed(newValue)
        setManualCollapse(newValue)
    }

    return (
        <div className="min-h-screen bg-zinc-100 dark:bg-background">
            {/* 왼쪽 가장자리 호버 존: 마우스 환경 + 소형 화면 + 사이드바 닫힘 */}
            {showEdgeTrigger && (
                <div
                    className="fixed left-0 top-0 z-40 h-full w-2 cursor-pointer"
                    onMouseEnter={() => {
                        openedByHoverRef.current = true
                        setSidebarOpen(true)
                    }}
                />
            )}

            <Sidebar
                isOpen={sidebarOpen}
                onToggle={toggleSidebar}
                isCollapsed={sidebarCollapsed}
                onCollapseToggle={toggleSidebarCollapse}
                onNavigateToMainMenu={handleNavigateToMainMenu}
                isWideScreen={isWideScreen}
                onMouseLeave={openedByHoverRef.current ? () => {
                    openedByHoverRef.current = false
                    setSidebarOpen(false)
                } : undefined}
            />

            {/* Main content area */}
            <div className={cn(
                'min-h-screen flex flex-col transition-all duration-300',
                sidebarCollapsed
                    ? (isInSubmenuArea ? 'lg:ml-48' : 'lg:ml-16')
                    : 'lg:ml-64'
            )}>
                <Header onSidebarToggle={toggleSidebar} logoutCountdownSeconds={logoutCountdownSeconds} />

                {/* 모바일 브레드크럼 */}
                <div className="lg:hidden px-4 py-2 border-b border-zinc-200 dark:border-border bg-white dark:bg-card">
                    <Breadcrumb />
                </div>

                <main className="flex-1 p-4 md:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
