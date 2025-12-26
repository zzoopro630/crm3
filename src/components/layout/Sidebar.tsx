import { Link, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import {
    LayoutDashboard,
    Users,
    UsersRound,
    Settings,
    LogOut,
    ChevronLeft,
    Menu,
} from 'lucide-react'

interface NavItem {
    title: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    adminOnly?: boolean // F1 전용
    managerOnly?: boolean // F1~F5 전용 (F6 제외)
}

const navItems: NavItem[] = [
    { title: '대시보드', href: '/', icon: LayoutDashboard },
    { title: '고객 관리', href: '/customers', icon: Users },
    { title: '팀 관리', href: '/team', icon: UsersRound, managerOnly: true },
    { title: '설정', href: '/settings', icon: Settings },
]

interface SidebarProps {
    isOpen: boolean
    onToggle: () => void
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
    const location = useLocation()
    const navigate = useNavigate()
    const { signOut, user, employee } = useAuthStore()

    const isAdmin = employee?.securityLevel === 'F1'
    const isManager = employee && ['F1', 'F2', 'F3', 'F4', 'F5'].includes(employee.securityLevel)

    const handleSignOut = async () => {
        await signOut()
        navigate('/login')
    }

    const visibleNavItems = navItems.filter(item => {
        if (item.adminOnly && !isAdmin) return false
        if (item.managerOnly && !isManager) return false
        return true
    })

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={onToggle}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed left-0 top-0 z-50 h-full w-64 bg-card border-r border-border transition-transform duration-300 ease-in-out lg:translate-x-0',
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <div className="flex h-full flex-col">
                    {/* Logo */}
                    <div className="flex h-16 items-center justify-between px-4 border-b border-border">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                                <span className="text-sm font-bold text-primary-foreground">FC</span>
                            </div>
                            <span className="text-lg font-semibold text-foreground">CRM</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggle}
                            className="lg:hidden text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1">
                        {visibleNavItems.map((item) => {
                            const isActive = location.pathname === item.href
                            return (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    onClick={() => {
                                        if (window.innerWidth < 1024) onToggle()
                                    }}
                                    className={cn(
                                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                                        isActive
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                                    )}
                                >
                                    <item.icon className="h-5 w-5" />
                                    {item.title}
                                </Link>
                            )
                        })}
                    </nav>

                    {/* User section */}
                    <div className="p-4 border-t border-border">
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary/50 mb-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                                <span className="text-xs font-medium text-primary-foreground">
                                    {employee?.fullName?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                    {employee?.fullName || user?.email?.split('@')[0] || '사용자'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {employee?.securityLevel || 'FC'}
                                    {employee?.positionName && ` · ${employee.positionName}`}
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={handleSignOut}
                            className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-secondary"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            로그아웃
                        </Button>
                    </div>
                </div>
            </aside>
        </>
    )
}

// Mobile trigger button
export function SidebarTrigger({ onToggle }: { onToggle: () => void }) {
    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="lg:hidden"
        >
            <Menu className="h-5 w-5" />
        </Button>
    )
}
