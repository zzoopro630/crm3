import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useThemeStore } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuPortal,
} from '@/components/ui/dropdown-menu'
import {
    Settings,
    LogOut,
    User,
    Moon,
    Sun,
    Monitor,
    ChevronDown,
    Palette,
    Check,
    Bell,
    CircleUser,
    Minus,
    Plus,
} from 'lucide-react'
import { SidebarTrigger } from './Sidebar'
import { Breadcrumb } from './Breadcrumb'
import { SECURITY_LEVELS } from '@/types/employee'

interface HeaderProps {
    onSidebarToggle: () => void
}

export function Header({ onSidebarToggle }: HeaderProps) {
    const navigate = useNavigate()
    const { theme, setTheme, fontSize, increaseFontSize, decreaseFontSize } = useThemeStore()
    const { signOut, user, employee } = useAuthStore()
    const handleSignOut = async () => {
        await signOut()
        navigate('/login')
    }

    // fontSize 적용
    useEffect(() => {
        document.documentElement.style.fontSize = `${fontSize}px`
    }, [fontSize])

    const getThemeLabel = () => {
        switch (theme) {
            case 'light': return '라이트'
            case 'dark': return '다크'
            default: return '시스템'
        }
    }

    return (
        <header className="sticky top-0 z-30 h-16 border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-zinc-800 dark:bg-zinc-900/95 dark:supports-[backdrop-filter]:bg-zinc-900/60">
            <div className="flex h-full items-center justify-between px-4 gap-4">
                <div className="flex items-center gap-4 shrink-0">
                    <SidebarTrigger onToggle={onSidebarToggle} />
                    <div className="flex md:hidden flex-col">
                        <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">
                            CRM
                        </h1>
                    </div>
                </div>

                {/* 중앙 Breadcrumb - 모바일에서는 숨김 처리하거나 타이틀 대신 보여줄 수도 있음 */}
                <div className="flex-1 hidden md:block overflow-hidden">
                    <Breadcrumb />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {/* 텍스트 배율 조절 */}
                    <div className="hidden md:flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={decreaseFontSize}
                            disabled={fontSize <= 12}
                            className="text-muted-foreground w-8 h-8"
                        >
                            <Minus className="h-4 w-4" />
                        </Button>
                        <span className="text-xs text-muted-foreground w-8 text-center tabular-nums">
                            {fontSize}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={increaseFontSize}
                            disabled={fontSize >= 18}
                            className="text-muted-foreground w-8 h-8"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* 알림 버튼 */}
                    <Button variant="ghost" size="icon" className="text-muted-foreground w-9 h-9">
                        <Bell className="h-5 w-5" />
                    </Button>

                    <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-2 hidden md:block" />

                    {/* 사용자 메뉴 */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-10 w-auto px-2 gap-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
                                <CircleUser className="h-8 w-8 text-muted-foreground stroke-1" />
                                <div className="flex flex-col items-start gap-0.5">
                                    <span className="text-sm font-medium leading-none text-foreground">{employee?.fullName || '사용자'}</span>
                                    <span className="text-xs text-muted-foreground leading-none">
                                        {SECURITY_LEVELS.find(l => l.value === employee?.securityLevel)?.label || employee?.securityLevel || '사용자'}
                                    </span>
                                </div>
                                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 ml-1" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{employee?.fullName || '사용자'}</p>
                                    <p className="text-xs leading-none text-muted-foreground">
                                        {SECURITY_LEVELS.find(l => l.value === employee?.securityLevel)?.label || user?.email}
                                    </p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => navigate('/settings/profile')}>
                                <User className="mr-2 h-4 w-4" />
                                내 계정
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate('/settings')}>
                                <Settings className="mr-2 h-4 w-4" />
                                설정
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    <Palette className="mr-2 h-4 w-4" />
                                    테마: {getThemeLabel()}
                                </DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                    <DropdownMenuSubContent>
                                        <DropdownMenuItem onClick={() => setTheme('light')}>
                                            <Sun className="mr-2 h-4 w-4" />
                                            라이트
                                            {theme === 'light' && <Check className="ml-auto h-4 w-4" />}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setTheme('dark')}>
                                            <Moon className="mr-2 h-4 w-4" />
                                            다크
                                            {theme === 'dark' && <Check className="ml-auto h-4 w-4" />}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => setTheme('system')}>
                                            <Monitor className="mr-2 h-4 w-4" />
                                            시스템
                                            {theme === 'system' && <Check className="ml-auto h-4 w-4" />}
                                        </DropdownMenuItem>
                                    </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                                <LogOut className="mr-2 h-4 w-4" />
                                로그아웃
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    )
}
