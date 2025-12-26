import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'

export function LoginPage() {
    const { signInWithGoogle, isAuthenticated, isLoading } = useAuthStore()
    const [isSigningIn, setIsSigningIn] = useState(false)

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (isAuthenticated) {
        return <Navigate to="/" replace />
    }

    const handleGoogleSignIn = async () => {
        setIsSigningIn(true)
        try {
            await signInWithGoogle()
        } catch (error) {
            console.error('Login failed:', error)
        } finally {
            setIsSigningIn(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
            <Card className="w-full max-w-md mx-4 border-zinc-700 bg-zinc-900/50 backdrop-blur-sm">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                        <span className="text-2xl font-bold text-white">FC</span>
                    </div>
                    <CardTitle className="text-2xl font-bold text-white">
                        퍼스트채널 CRM
                    </CardTitle>
                    <CardDescription className="text-zinc-400">
                        고객 관리 시스템에 로그인하세요
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button
                        onClick={handleGoogleSignIn}
                        disabled={isSigningIn}
                        className="w-full h-12 bg-white hover:bg-zinc-100 text-zinc-900 font-medium"
                        variant="outline"
                    >
                        {isSigningIn ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                                <path
                                    fill="currentColor"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                        )}
                        Google로 로그인
                    </Button>
                    <p className="text-center text-xs text-zinc-500">
                        등록된 사원 이메일로만 로그인할 수 있습니다
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
