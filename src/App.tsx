import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore, applyTheme } from '@/stores/themeStore'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { AccessDeniedPage } from '@/pages/AccessDeniedPage'
import { CustomersPage } from '@/pages/CustomersPage'
import { CustomerDetailPage } from '@/pages/CustomerDetailPage'
import { TeamPage } from '@/pages/TeamPage'
import { SettingsPage } from '@/pages/SettingsPage'
import './App.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

function AppContent() {
  const initialize = useAuthStore((state) => state.initialize)
  const theme = useThemeStore((state) => state.theme)

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Access denied (logged in but not approved) */}
      <Route
        path="/access-denied"
        element={
          <ProtectedRoute requireApproval={false}>
            <AccessDeniedPage />
          </ProtectedRoute>
        }
      />

      {/* Protected routes (requires approval) */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/:id" element={<CustomerDetailPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        {/* 기존 개별 경로들을 /settings로 리다이렉트 */}
        <Route path="/organizations" element={<Navigate to="/settings" replace />} />
        <Route path="/sources" element={<Navigate to="/settings" replace />} />
        <Route path="/employees" element={<Navigate to="/settings" replace />} />
        <Route path="/approvals" element={<Navigate to="/settings" replace />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
