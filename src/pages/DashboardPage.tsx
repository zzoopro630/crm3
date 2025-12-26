import { Link } from 'react-router-dom'
import { useDashboardStats } from '@/hooks/useDashboard'
import { useAuthStore } from '@/stores/authStore'
import { Loader2, Users, UserPlus, MessageSquare, CheckCircle } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
    new: '신규',
    contacted: '연락완료',
    consulting: '상담중',
    closed: '계약완료',
}

export function DashboardPage() {
    const { data: stats, isLoading, error } = useDashboardStats()
    const employee = useAuthStore((state) => state.employee)

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
                <p className="text-red-600 dark:text-red-400">데이터를 불러오는 중 오류가 발생했습니다.</p>
            </div>
        )
    }

    const statCards = [
        {
            label: '전체 고객',
            value: stats?.totalCustomers || 0,
            icon: Users,
            color: 'text-violet-600 dark:text-violet-400',
            bgColor: 'bg-violet-100 dark:bg-violet-900/30',
        },
        {
            label: '신규 고객',
            value: stats?.newCustomers || 0,
            icon: UserPlus,
            color: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        },
        {
            label: '상담 중',
            value: stats?.consultingCustomers || 0,
            icon: MessageSquare,
            color: 'text-amber-600 dark:text-amber-400',
            bgColor: 'bg-amber-100 dark:bg-amber-900/30',
        },
        {
            label: '계약 완료',
            value: stats?.closedCustomers || 0,
            icon: CheckCircle,
            color: 'text-emerald-600 dark:text-emerald-400',
            bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
        },
    ]

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">대시보드</h1>
                <p className="text-zinc-500 dark:text-zinc-400">
                    {employee?.securityLevel === 'F1'
                        ? '전체 현황을 한눈에 확인하세요'
                        : '내 고객 현황을 한눈에 확인하세요'}
                </p>
            </div>

            {/* Stats cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat) => {
                    const Icon = stat.icon
                    return (
                        <div
                            key={stat.label}
                            className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
                        >
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{stat.label}</p>
                                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                                    <Icon className={`w-5 h-5 ${stat.color}`} />
                                </div>
                            </div>
                            <p className="mt-3 text-3xl font-bold text-zinc-900 dark:text-white">
                                {stat.value.toLocaleString()}
                            </p>
                        </div>
                    )
                })}
            </div>

            {/* Recent Activity */}
            <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">최근 등록 고객</h2>
                </div>
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {stats?.recentCustomers && stats.recentCustomers.length > 0 ? (
                        stats.recentCustomers.map((customer) => (
                            <Link
                                key={customer.id}
                                to={`/customers/${customer.id}`}
                                className="flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                                        <span className="text-sm font-medium text-violet-600 dark:text-violet-400">
                                            {customer.name.charAt(0)}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-medium text-zinc-900 dark:text-white">{customer.name}</p>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                            {customer.managerName || '담당자 미지정'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                        customer.status === 'new'
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                            : customer.status === 'contacted'
                                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                                : customer.status === 'consulting'
                                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    }`}>
                                        {STATUS_LABELS[customer.status] || customer.status}
                                    </span>
                                    <span className="text-sm text-zinc-400 dark:text-zinc-500">
                                        {new Date(customer.createdAt).toLocaleDateString('ko-KR')}
                                    </span>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="p-12 text-center">
                            <Users className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600" />
                            <p className="mt-4 text-zinc-500 dark:text-zinc-400">아직 등록된 고객이 없습니다</p>
                            <Link
                                to="/customers"
                                className="mt-4 inline-block text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                            >
                                첫 고객 등록하기 →
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
