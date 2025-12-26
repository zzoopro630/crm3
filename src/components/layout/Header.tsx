import { useThemeStore, applyTheme } from '@/stores/themeStore'
import { Button } from '@/components/ui/button'
import { Moon, Sun } from 'lucide-react'
import { useEffect } from 'react'
import { SidebarTrigger } from './Sidebar'

interface HeaderProps {
    onSidebarToggle: () => void
}

export function Header({ onSidebarToggle }: HeaderProps) {
    const { theme, setTheme } = useThemeStore()

    useEffect(() => {
        applyTheme(theme)
    }, [theme])

    const toggleTheme = () => {
        // 현재 테마가 dark면 light로, 그 외에는 dark로 전환
        const newTheme = theme === 'dark' ? 'light' : 'dark'
        setTheme(newTheme)
    }

    return (
        <header className="sticky top-0 z-30 h-16 border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-zinc-800 dark:bg-zinc-900/95 dark:supports-[backdrop-filter]:bg-zinc-900/60">
            <div className="flex h-full items-center justify-between px-4">
                <div className="flex items-center gap-4">
                    <SidebarTrigger onToggle={onSidebarToggle} />
                    <h1 className="text-lg font-semibold text-zinc-900 dark:text-white hidden sm:block">
                        대시보드
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleTheme}
                        className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                    >
                        {theme === 'dark' ? (
                            <Sun className="h-5 w-5" />
                        ) : (
                            <Moon className="h-5 w-5" />
                        )}
                        <span className="sr-only">테마 전환</span>
                    </Button>
                </div>
            </div>
        </header>
    )
}
