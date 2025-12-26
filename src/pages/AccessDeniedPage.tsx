import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, LogOut } from 'lucide-react'

export function AccessDeniedPage() {
    const { signOut, user } = useAuthStore()

    const handleSignOut = async () => {
        await signOut()
        window.location.href = '/login'
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-100 dark:bg-zinc-950 p-4">
            <Card className="w-full max-w-md border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                        <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                    </div>
                    <CardTitle className="text-xl font-bold text-zinc-900 dark:text-white">
                        승인 대기 중
                    </CardTitle>
                    <CardDescription className="text-zinc-600 dark:text-zinc-400">
                        관리자의 승인을 기다리고 있습니다
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 text-center">
                    <div className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">로그인 계정</p>
                        <p className="font-medium text-zinc-900 dark:text-white">{user?.email}</p>
                    </div>

                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        귀하의 계정은 현재 시스템에 등록되어 있지 않습니다.<br />
                        관리자가 승인하면 시스템을 이용할 수 있습니다.
                    </p>

                    <Button
                        variant="outline"
                        onClick={handleSignOut}
                        className="w-full"
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        다른 계정으로 로그인
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
