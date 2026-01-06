import { Link } from 'react-router-dom'
import { useDashboardStats } from '@/hooks/useDashboard'
import { Loader2, Users, UserPlus, MessageSquare, CheckCircle } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
    new: '신규',
    contacted: '연락완료',
    consulting: '상담중',
    closed: '청약완료',
}

export function DashboardPage() {
    const { data: stats, isLoading, error } = useDashboardStats()

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
            color: 'text-primary',
            bgColor: 'bg-primary/10',
        },
        {
            label: '신규 고객',
            value: stats?.newCustomers || 0,
            icon: UserPlus,
            color: 'text-primary',
            bgColor: 'bg-primary/10',
        },
        {
            label: '상담 중',
            value: stats?.consultingCustomers || 0,
            icon: MessageSquare,
            color: 'text-primary',
            bgColor: 'bg-primary/10',
        },
        {
            label: '계약 완료',
            value: stats?.closedCustomers || 0,
            icon: CheckCircle,
            color: 'text-primary',
            bgColor: 'bg-primary/10',
        },
    ]

    return (
        <div className="space-y-6">
            {/* Page header removed */}


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
                                    <div>
                                        <p className="font-medium text-zinc-900 dark:text-white">{customer.name}</p>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                            {customer.managerName || '담당자 미지정'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span
                                        className="px-2 py-1 text-xs font-medium rounded-full border"
                                        style={{
                                            backgroundColor: `var(--status-${customer.status}-bg, var(--status-new-bg))`,
                                            color: `var(--status-${customer.status}, var(--status-new))`,
                                            borderColor: `var(--status-${customer.status}, var(--status-new))`,
                                        }}
                                    >
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
