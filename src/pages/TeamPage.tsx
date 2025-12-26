import { useState } from 'react'
import { useTeamMembers, useTeamStats } from '@/hooks/useTeam'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Users, UserCheck, MessageSquare, FileText, CheckCircle, Loader2, Search } from 'lucide-react'
import { Link } from 'react-router-dom'

export function TeamPage() {
    const { employee } = useAuthStore()
    const { data: teamMembers, isLoading } = useTeamMembers()
    const memberIds = teamMembers?.map(m => m.id) || []
    const { data: stats } = useTeamStats(memberIds)

    const [searchQuery, setSearchQuery] = useState('')

    const filteredMembers = teamMembers?.filter(member =>
        member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const getSecurityLevelBadge = (level: string) => {
        const colors: Record<string, string> = {
            F1: 'bg-red-500/10 text-red-500 border-red-500/20',
            F2: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
            F3: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
            F4: 'bg-green-500/10 text-green-500 border-green-500/20',
            F5: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            F6: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
        }
        return colors[level] || colors.F6
    }

    // F6 사용자는 팀 관리 접근 불가
    if (employee?.securityLevel === 'F6') {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <Users className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
                    <p className="text-zinc-500">팀 관리 권한이 없습니다</p>
                </div>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">팀 관리</h1>
                <p className="text-zinc-500 dark:text-zinc-400">팀원 현황 및 고객 배정을 관리합니다</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/10">
                                <Users className="h-5 w-5 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-sm text-zinc-500">팀원</p>
                                <p className="text-xl font-bold text-zinc-900 dark:text-white">{teamMembers?.length || 0}명</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <UserCheck className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm text-zinc-500">총 고객</p>
                                <p className="text-xl font-bold text-zinc-900 dark:text-white">{stats?.totalCustomers || 0}명</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-500/10">
                                <FileText className="h-5 w-5 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-sm text-zinc-500">신규</p>
                                <p className="text-xl font-bold text-zinc-900 dark:text-white">{stats?.byStatus.new || 0}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-yellow-500/10">
                                <MessageSquare className="h-5 w-5 text-yellow-500" />
                            </div>
                            <div>
                                <p className="text-sm text-zinc-500">상담중</p>
                                <p className="text-xl font-bold text-zinc-900 dark:text-white">{stats?.byStatus.consulting || 0}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/10">
                                <CheckCircle className="h-5 w-5 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-sm text-zinc-500">계약완료</p>
                                <p className="text-xl font-bold text-zinc-900 dark:text-white">{stats?.byStatus.closed || 0}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                    placeholder="팀원 이름 또는 이메일로 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white dark:bg-zinc-900"
                />
            </div>

            {/* Team Members Table */}
            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <CardHeader>
                    <CardTitle className="text-zinc-900 dark:text-white">팀원 목록</CardTitle>
                    <CardDescription>팀원별 고객 현황을 확인하고 관리합니다</CardDescription>
                </CardHeader>
                <CardContent>
                    {filteredMembers?.length === 0 ? (
                        <div className="text-center py-12 text-zinc-500">
                            <Users className="h-12 w-12 mx-auto mb-4 text-zinc-400" />
                            <p>팀원이 없습니다</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                                        <th className="text-left py-3 px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">이름</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">보안등급</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">부서</th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">총 고객</th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">신규</th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">연락완료</th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">상담중</th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">계약완료</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">작업</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredMembers?.map((member) => (
                                        <tr
                                            key={member.id}
                                            className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                        >
                                            <td className="py-3 px-4">
                                                <div>
                                                    <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                                        {member.fullName}
                                                        {member.id === employee?.id && (
                                                            <span className="ml-2 text-xs text-emerald-500">(본인)</span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-zinc-500">{member.email}</p>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-md border ${getSecurityLevelBadge(member.securityLevel)}`}>
                                                    {member.securityLevel}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-400">
                                                {member.department || member.positionName || '-'}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="font-semibold text-zinc-900 dark:text-white">
                                                    {member.customerCount}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center text-sm text-purple-500">
                                                {member.customersByStatus.new}
                                            </td>
                                            <td className="py-3 px-4 text-center text-sm text-blue-500">
                                                {member.customersByStatus.contacted}
                                            </td>
                                            <td className="py-3 px-4 text-center text-sm text-yellow-500">
                                                {member.customersByStatus.consulting}
                                            </td>
                                            <td className="py-3 px-4 text-center text-sm text-emerald-500">
                                                {member.customersByStatus.closed}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <Link to={`/customers?manager=${member.id}`}>
                                                    <Button variant="ghost" size="sm">
                                                        고객 보기
                                                    </Button>
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
