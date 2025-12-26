import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import { Building2, Tag, UserCog, Clock, Settings as SettingsIcon } from 'lucide-react'

// Sub-pages
import { OrganizationsPage } from './OrganizationsPage'
import { SourcesPage } from './SourcesPage'
import { EmployeesPage } from './EmployeesPage'
import { PendingApprovalsPage } from './PendingApprovalsPage'

interface SettingsTab {
    id: string
    label: string
    icon: React.ComponentType<{ className?: string }>
    component: React.ComponentType
    adminOnly?: boolean
}

const settingsTabs: SettingsTab[] = [
    { id: 'organizations', label: '조직 관리', icon: Building2, component: OrganizationsPageWrapper, adminOnly: true },
    { id: 'sources', label: '소스 관리', icon: Tag, component: SourcesPageWrapper, adminOnly: true },
    { id: 'employees', label: '사원 관리', icon: UserCog, component: EmployeesPageWrapper, adminOnly: true },
    { id: 'approvals', label: '승인 대기', icon: Clock, component: PendingApprovalsPageWrapper, adminOnly: true },
    { id: 'system', label: '시스템 설정', icon: SettingsIcon, component: SystemSettings },
]

// Wrapper 컴포넌트들 (헤더 제거 버전)
function OrganizationsPageWrapper() {
    return <OrganizationsPage />
}

function SourcesPageWrapper() {
    return <SourcesPage />
}

function EmployeesPageWrapper() {
    return <EmployeesPage />
}

function PendingApprovalsPageWrapper() {
    return <PendingApprovalsPage />
}

function SystemSettings() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">시스템 설정</h2>
                <p className="text-zinc-500 dark:text-zinc-400">앱 설정을 관리합니다</p>
            </div>
            <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <p className="text-zinc-500 dark:text-zinc-400">추후 기능 추가 예정</p>
            </div>
        </div>
    )
}

export function SettingsPage() {
    const { employee } = useAuthStore()
    const [activeTab, setActiveTab] = useState('organizations')

    // 관리자 권한 체크
    const isAdmin = employee?.securityLevel === 'F1'

    // 접근 가능한 탭만 필터링
    const accessibleTabs = settingsTabs.filter(tab => !tab.adminOnly || isAdmin)

    // 현재 탭이 접근 불가능하면 첫 번째 탭으로
    const currentTab = accessibleTabs.find(t => t.id === activeTab) || accessibleTabs[0]
    const ActiveComponent = currentTab?.component || SystemSettings

    // F1이 아닌 경우 시스템 설정만 표시
    if (!isAdmin) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">설정</h1>
                    <p className="text-zinc-500 dark:text-zinc-400">앱 설정을 관리합니다</p>
                </div>
                <SystemSettings />
            </div>
        )
    }

    return (
        <div className="flex gap-6 min-h-[calc(100vh-8rem)]">
            {/* Left Sidebar - Tab Menu */}
            <div className="w-56 shrink-0">
                <div className="sticky top-6">
                    <h1 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">설정</h1>
                    <nav className="space-y-1">
                        {accessibleTabs.map((tab) => {
                            const Icon = tab.icon
                            const isActive = currentTab?.id === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left",
                                        isActive
                                            ? "bg-primary text-primary-foreground"
                                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    )}
                                >
                                    <Icon className="h-5 w-5" />
                                    {tab.label}
                                </button>
                            )
                        })}
                    </nav>
                </div>
            </div>

            {/* Right Content */}
            <div className="flex-1 min-w-0">
                <ActiveComponent />
            </div>
        </div>
    )
}
