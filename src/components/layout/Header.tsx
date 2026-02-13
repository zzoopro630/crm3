import { useState, useEffect, useRef, useCallback } from 'react'
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
} from '@/components/ui/dropdown-menu'
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogCancel,
    AlertDialogAction,
} from '@/components/ui/alert-dialog'
import {
    Settings,
    LogOut,
    User,
    Moon,
    Sun,
    ChevronDown,
    Bell,
    CircleUser,
} from 'lucide-react'
import { SidebarTrigger } from './Sidebar'
import { Breadcrumb } from './Breadcrumb'
import { SECURITY_LEVELS } from '@/types/employee'
import { useAppConfig } from '@/hooks/useAppConfig'

interface HeaderProps {
    onSidebarToggle: () => void
    logoutCountdownSeconds?: number
}

export function Header({ onSidebarToggle, logoutCountdownSeconds = 30 }: HeaderProps) {
    const navigate = useNavigate()
    const { theme, setTheme, fontScale, increaseFontScale, decreaseFontScale } = useThemeStore()
    const { defaultFontSize } = useAppConfig()
    const { signOut, user, employee } = useAuthStore()
    const [showLogoutDialog, setShowLogoutDialog] = useState(false)
    const [countdown, setCountdown] = useState(logoutCountdownSeconds)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const handleSignOut = useCallback(async () => {
        setShowLogoutDialog(false)
        if (timerRef.current) clearInterval(timerRef.current)
        try {
            await signOut()
        } catch {
            // signOut 실패해도 로그인 페이지로 이동
        }
        navigate('/login')
    }, [signOut, navigate])

    // 카운트다운 타이머
    useEffect(() => {
        if (!showLogoutDialog) return

        setCountdown(logoutCountdownSeconds)
        timerRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [showLogoutDialog, logoutCountdownSeconds])

    // 카운트다운 0 도달 시 자동 로그아웃
    useEffect(() => {
        if (countdown === 0 && showLogoutDialog) {
            handleSignOut()
        }
    }, [countdown, showLogoutDialog, handleSignOut])

    const handleCancelLogout = () => {
        setShowLogoutDialog(false)
        if (timerRef.current) clearInterval(timerRef.current)
    }

    // 폰트 크기 적용: 관리자 기본값(px) × 사용자 배율(%)
    const computedFontSize = Math.round(defaultFontSize * fontScale / 100)
    useEffect(() => {
        document.documentElement.style.fontSize = `${computedFontSize}px`
    }, [computedFontSize])

    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    const toggleTheme = () => {
        setTheme(isDark ? 'light' : 'dark')
    }

    return (
        <>
            <header className="sticky top-0 z-30 h-16 border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-border dark:bg-card/95 dark:supports-[backdrop-filter]:bg-card/60">
                <div className="flex h-full items-center justify-between px-4 gap-4">
                    <div className="flex items-center gap-4 shrink-0">
                        <SidebarTrigger onToggle={onSidebarToggle} />
                        <div className="flex lg:hidden flex-col">
                            <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                CRM
                            </h1>
                        </div>
                    </div>

                    {/* 중앙 Breadcrumb - 모바일에서는 숨김 처리하거나 타이틀 대신 보여줄 수도 있음 */}
                    <div className="flex-1 hidden lg:block overflow-hidden">
                        <Breadcrumb />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {/* 텍스트 배율 조절 */}
                        <div className="hidden md:flex items-center bg-zinc-100 dark:bg-secondary rounded-lg overflow-hidden">
                            <button
                                onClick={decreaseFontScale}
                                disabled={fontScale <= 80}
                                className="px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-zinc-200 dark:hover:bg-accent disabled:opacity-30 transition-colors"
                            >
                                가
                            </button>
                            <span className="px-2 py-1.5 text-xs font-medium text-foreground tabular-nums min-w-[3rem] text-center border-x border-zinc-200 dark:border-border">
                                {fontScale}%
                            </span>
                            <button
                                onClick={increaseFontScale}
                                disabled={fontScale >= 150}
                                className="px-2.5 py-1.5 text-base font-medium text-muted-foreground hover:bg-zinc-200 dark:hover:bg-accent disabled:opacity-30 transition-colors"
                            >
                                가
                            </button>
                        </div>

                        {/* 테마 토글 */}
                        <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground w-9 h-9">
                            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                        </Button>

                        {/* 알림 버튼 */}
                        <Button variant="ghost" size="icon" className="text-muted-foreground w-9 h-9">
                            <Bell className="h-5 w-5" />
                        </Button>

                        <div className="h-6 w-px bg-zinc-200 dark:bg-border mx-2 hidden md:block" />

                        {/* 사용자 메뉴 */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-10 w-auto px-2 gap-2 rounded-md hover:bg-zinc-100 dark:hover:bg-secondary">
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
                                <DropdownMenuItem onSelect={() => navigate('/settings/profile')}>
                                    <User className="mr-2 h-4 w-4" />
                                    내 계정
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => navigate('/settings')}>
                                    <Settings className="mr-2 h-4 w-4" />
                                    설정
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => setShowLogoutDialog(true)} className="text-destructive focus:text-destructive">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    로그아웃
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            {/* 로그아웃 확인 다이얼로그 */}
            <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>로그아웃 하시겠습니까?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {countdown}초 후 자동으로 로그아웃됩니다.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCancelLogout}>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSignOut}>로그아웃</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
