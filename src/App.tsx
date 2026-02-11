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
import { OrganizationsPage } from '@/pages/OrganizationsPage'
import LabelsPage from '@/pages/LabelsPage'
import { EmployeesPage } from '@/pages/EmployeesPage'
import { PendingApprovalsPage } from '@/pages/PendingApprovalsPage'
import { SystemSettingsPage } from '@/pages/SystemSettingsPage'
import DbManagementPage from '@/pages/DbManagementPage'
import TrashPage from '@/pages/TrashPage'
import MenuPermissionsPage from '@/pages/MenuPermissionsPage'
import { AdsPage } from '@/pages/AdsPage'
import AdsNDataPage from '@/pages/ads/AdsNDataPage'
import AdsReportPage from '@/pages/ads/AdsReportPage'
import AdsWeeklyPage from '@/pages/ads/AdsWeeklyPage'
import AdsPowerLinkPage from '@/pages/ads/AdsPowerLinkPage'
import ContactsDirectPage from '@/pages/ContactsDirectPage'
import ConsultantInquiriesPage from '@/pages/ConsultantInquiriesPage'
import RecruitInquiriesPage from '@/pages/RecruitInquiriesPage'
import MenuSettingsPage from '@/pages/MenuSettingsPage'
import RankDashboardPage from '@/pages/rank/RankDashboardPage'
import RankKeywordsPage from '@/pages/rank/RankKeywordsPage'
import RankUrlTrackingPage from '@/pages/rank/RankUrlTrackingPage'
import RankHistoryPage from '@/pages/rank/RankHistoryPage'
import PostListPage from '@/pages/posts/PostListPage'
import PostDetailPage from '@/pages/posts/PostDetailPage'
import BoardCategoriesPage from '@/pages/BoardCategoriesPage'
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
        <Route path="/inquiries" element={<DbManagementPage />} />
        <Route path="/customers/trash" element={<TrashPage />} />
        {/* Legacy routes redirect */}
        <Route path="/db-management" element={<Navigate to="/inquiries" replace />} />
        <Route path="/trash" element={<Navigate to="/customers/trash" replace />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/contacts-direct" element={<ContactsDirectPage />} />
        <Route path="/consultant-inquiries" element={<ConsultantInquiriesPage />} />
        <Route path="/recruit-inquiries" element={<RecruitInquiriesPage />} />

        {/* 게시판 - 동적 카테고리 */}
        <Route path="/board/:slug" element={<PostListPage />} />
        <Route path="/board/:slug/:id" element={<PostDetailPage />} />
        {/* 레거시 리다이렉트 */}
        <Route path="/notices" element={<Navigate to="/board/notice" replace />} />
        <Route path="/notices/:id" element={<Navigate to="/board/notice" replace />} />
        <Route path="/resources" element={<Navigate to="/board/resource" replace />} />
        <Route path="/resources/:id" element={<Navigate to="/board/resource" replace />} />

        {/* Ads nested routes */}
        <Route path="/ads" element={<AdsPage />}>
          <Route index element={<Navigate to="ndata" replace />} />
          <Route path="ndata" element={<AdsNDataPage />} />
          <Route path="powerlink" element={<AdsPowerLinkPage />} />
          <Route path="report" element={<AdsReportPage />} />
          <Route path="weekly" element={<AdsWeeklyPage />} />
          <Route path="rank-dashboard" element={<RankDashboardPage />} />
          <Route path="rank-keywords" element={<RankKeywordsPage />} />
          <Route path="rank-urls" element={<RankUrlTrackingPage />} />
          <Route path="rank-history" element={<RankHistoryPage />} />
        </Route>

        {/* Legacy rank routes redirect */}
        <Route path="/rank" element={<Navigate to="/ads/rank-dashboard" replace />} />
        <Route path="/rank/*" element={<Navigate to="/ads/rank-dashboard" replace />} />

        {/* Settings nested routes */}
        <Route path="/settings" element={<SettingsPage />}>
          <Route index element={<Navigate to="organizations" replace />} />
          <Route path="organizations" element={<OrganizationsPage />} />
          <Route path="labels" element={<LabelsPage />} />
          <Route path="menus" element={<MenuSettingsPage />} />
          <Route path="menu-permissions" element={<MenuPermissionsPage />} />
          <Route path="board-categories" element={<BoardCategoriesPage />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="approvals" element={<PendingApprovalsPage />} />
          <Route path="system" element={<SystemSettingsPage />} />
        </Route>

        {/* Legacy routes redirect */}
        <Route path="/organizations" element={<Navigate to="/settings/organizations" replace />} />
        <Route path="/employees" element={<Navigate to="/settings/employees" replace />} />
        <Route path="/approvals" element={<Navigate to="/settings/approvals" replace />} />
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
