import { useState } from 'react'
import { useTeamMembers, useTeamStats } from '@/hooks/useTeam'
import { useOrganizations } from '@/hooks/useOrganizations'
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Users, UserCheck, MessageSquare, FileText, CheckCircle, Loader2, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { TeamMember } from '@/services/team'

export function TeamPage() {
    const { employee } = useAuthStore()
    const { data: teamMembers, isLoading } = useTeamMembers()
    const { data: organizations } = useOrganizations()
    const memberIds = teamMembers?.map(m => m.id) || []
    const { data: stats } = useTeamStats(memberIds)

    const [searchQuery, setSearchQuery] = useState('')
    const [collapsedOrgs, setCollapsedOrgs] = useState<Set<string>>(new Set())
    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)

    // 조직 ID로 조직명 찾기
    const getOrganizationName = (orgId: number | null | undefined) => {
        if (!orgId || !organizations) return '-'
        return organizations.find((o) => o.id === orgId)?.name || '-'
    }

    // 직급 우선순위 (낮을수록 상단)
    const getPositionPriority = (position: string | null): number => {
        const priorities: Record<string, number> = {
            대표: 1,
            총괄이사: 2,
            사업단장: 3,
            지점장: 4,
            팀장: 5,
            FC: 6,
            실장: 10,
            과장: 11,
            대리: 12,
            주임: 13,
            사원: 14,
        }
        return priorities[position || ''] || 99
    }

    // 대표 직속 조직 여부
    const isDirectOrg = (orgName: string) => {
        return ['영업지원팀', '총무팀'].includes(orgName)
    }

    // 조직 정렬 우선순위
    const getOrgPriority = (orgName: string): number => {
        if (orgName === '영업지원팀') return 1
        if (orgName === '총무팀') return 2
        return 10
    }

    // 사원 ID로 사원명 찾기 (상위자)
    const getEmployeeName = (empId: string | null) => {
        if (!empId || !teamMembers) return '-'
        return teamMembers.find((e) => e.id === empId)?.fullName || '-'
    }

    // 트리 순회 정렬 (상위자 → 하위자 순서로 연속 배치)
    const buildTreeSortedList = (empList: TeamMember[]): TeamMember[] => {
        const result: TeamMember[] = []
        const visited = new Set<string>()

        const addWithChildren = (emp: TeamMember) => {
            if (visited.has(emp.id)) return
            visited.add(emp.id)
            result.push(emp)

            const children = empList
                .filter((e) => e.parentId === emp.id && !visited.has(e.id))
                .sort((a, b) => getPositionPriority(a.positionName) - getPositionPriority(b.positionName))
            children.forEach((child) => addWithChildren(child))
        }

        const roots = empList
            .filter((emp) => !emp.parentId || !empList.some((e) => e.id === emp.parentId))
            .sort((a, b) => getPositionPriority(a.positionName) - getPositionPriority(b.positionName))

        roots.forEach((root) => addWithChildren(root))

        empList
            .filter((emp) => !visited.has(emp.id))
            .sort((a, b) => getPositionPriority(a.positionName) - getPositionPriority(b.positionName))
            .forEach((emp) => addWithChildren(emp))

        return result
    }

    const getSecurityLevelBadge = (level: string) => {
        const colors: Record<string, string> = {
            F1: 'bg-red-500/10 text-red-500 border-red-500/20',
            F2: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
            F3: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
            F4: 'bg-green-500/10 text-green-500 border-green-500/20',
            F5: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        }
        return colors[level] || colors.F5
    }

    const toggleOrgCollapse = (orgName: string) => {
        setCollapsedOrgs((prev) => {
            const next = new Set(prev)
            if (next.has(orgName)) {
                next.delete(orgName)
            } else {
                next.add(orgName)
            }
            return next
        })
    }

    // 필터링
    const filteredMembers = teamMembers?.filter(member =>
        member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase())
    ) || []

    // 대표 추출
    const ceoList = filteredMembers
        .filter((emp) => emp.positionName === '대표')
        .sort((a, b) => a.fullName.localeCompare(b.fullName))

    // 나머지 사원 (대표 제외)
    const nonCeoList = filteredMembers.filter((emp) => emp.positionName !== '대표')

    type OrgGroup = {
        orgName: string
        orgId: number | null
        members: TeamMember[]
    }

    // 조직별 그룹핑 + 트리 정렬
    const groupByOrganization = (): OrgGroup[] => {
        const groups: OrgGroup[] = []
        const byOrg = new Map<number | null, TeamMember[]>()

        nonCeoList.forEach((emp) => {
            const orgId = emp.organizationId || null
            if (!byOrg.has(orgId)) byOrg.set(orgId, [])
            byOrg.get(orgId)!.push(emp)
        })

        Array.from(byOrg.entries()).forEach(([orgId, members]) => {
            const orgName = getOrganizationName(orgId)
            const sortedMembers = buildTreeSortedList(members)
            groups.push({
                orgName,
                orgId,
                members: sortedMembers,
            })
        })

        return groups.sort((a, b) => {
            const priorityA = getOrgPriority(a.orgName)
            const priorityB = getOrgPriority(b.orgName)
            if (priorityA !== priorityB) return priorityA - priorityB
            return a.orgName.localeCompare(b.orgName)
        })
    }

    const organizationGroups = groupByOrganization()

    // 대표 직속 조직 (3열 배치용)
    const directGroups = organizationGroups.filter((g) => isDirectOrg(g.orgName) || g.orgName === '-')
    // 사업단 (세로 배치용)
    const businessGroups = organizationGroups.filter((g) => !isDirectOrg(g.orgName) && g.orgName !== '-')

    // 멤버 카드 렌더링
    const renderMemberCard = (member: TeamMember) => (
        <div
            key={member.id}
            className="p-3 border rounded-lg bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                        <span
                            className="cursor-pointer hover:underline text-primary"
                            onClick={() => setSelectedMember(member)}
                        >
                            {member.fullName}
                        </span>
                        {member.id === employee?.id && (
                            <span className="ml-1 text-xs text-emerald-500">(본인)</span>
                        )}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">{member.positionName || '-'}</p>
                    <p className="text-xs text-zinc-400 truncate">상위자: {getEmployeeName(member.parentId)}</p>
                </div>
                <span className={`shrink-0 inline-flex px-1.5 py-0.5 text-xs font-medium rounded border ${getSecurityLevelBadge(member.securityLevel)}`}>
                    {member.securityLevel}
                </span>
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs">
                <span className="text-zinc-600 dark:text-zinc-400">
                    고객 <span className="font-semibold text-zinc-900 dark:text-white">{member.customerCount}</span>
                </span>
                <span className="text-purple-500">신규 {member.customersByStatus.new}</span>
                <span className="text-yellow-500">상담 {member.customersByStatus.consulting}</span>
                <span className="text-emerald-500">완료 {member.customersByStatus.closed}</span>
            </div>
            <div className="mt-2">
                <Link to={`/customers?manager=${member.id}`}>
                    <Button variant="ghost" size="sm" className="h-7 text-xs w-full">
                        고객 보기
                    </Button>
                </Link>
            </div>
        </div>
    )

    // 조직 섹션 렌더링 (접기/펼치기)
    const renderOrgSection = (group: OrgGroup, collapsible = true) => (
        <div key={group.orgName} className="border rounded-lg overflow-hidden">
            {collapsible ? (
                <button
                    className="w-full bg-muted/50 px-4 py-3 font-semibold text-base flex items-center justify-between hover:bg-muted/70 transition-colors"
                    onClick={() => toggleOrgCollapse(group.orgName)}
                >
                    <div className="flex items-center gap-2">
                        {collapsedOrgs.has(group.orgName) ? (
                            <ChevronRight className="h-5 w-5" />
                        ) : (
                            <ChevronDown className="h-5 w-5" />
                        )}
                        <span>{group.orgName}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{group.members.length}명</span>
                </button>
            ) : (
                <div className="bg-muted/50 px-4 py-3 font-semibold text-base flex items-center justify-between">
                    <span>{group.orgName}</span>
                    <span className="text-sm text-muted-foreground">{group.members.length}명</span>
                </div>
            )}
            {(!collapsible || !collapsedOrgs.has(group.orgName)) && (
                <div className="p-3 space-y-2">
                    {group.members.map(renderMemberCard)}
                </div>
            )}
        </div>
    )

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
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
                                <p className="text-sm text-zinc-500">청약완료</p>
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

            {/* Team Members */}
            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <CardHeader>
                    <CardTitle className="text-zinc-900 dark:text-white">팀원 목록</CardTitle>
                    <CardDescription>팀원별 고객 현황을 확인하고 관리합니다</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {filteredMembers.length === 0 ? (
                        <div className="text-center py-12 text-zinc-500">
                            <Users className="h-12 w-12 mx-auto mb-4 text-zinc-400" />
                            <p>팀원이 없습니다</p>
                        </div>
                    ) : (
                        <>
                            {/* 대표 + 직속 조직 (3열 배치) */}
                            {(ceoList.length > 0 || directGroups.length > 0) && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* 대표 섹션 */}
                                    {ceoList.length > 0 && (
                                        <div className="border rounded-lg overflow-hidden">
                                            <div className="bg-muted/50 px-4 py-3 font-semibold text-base flex items-center justify-between">
                                                <span>대표</span>
                                                <span className="text-sm text-muted-foreground">{ceoList.length}명</span>
                                            </div>
                                            <div className="p-3 space-y-2">
                                                {ceoList.map(renderMemberCard)}
                                            </div>
                                        </div>
                                    )}
                                    {/* 직속 조직 (영업지원팀, 총무팀) */}
                                    {directGroups.map((group) => renderOrgSection(group, false))}
                                </div>
                            )}

                            {/* 사업단 (세로 배치, 접기/펼치기) */}
                            {businessGroups.map((group) => renderOrgSection(group, true))}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* 팀원 상세 정보 다이얼로그 */}
            <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
                <DialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-zinc-900 dark:text-white">
                            팀원 정보
                        </DialogTitle>
                    </DialogHeader>
                    {selectedMember && (
                        <div className="space-y-4 mt-2">
                            <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                                <span className="text-zinc-500">이름</span>
                                <span className="text-zinc-900 dark:text-white font-medium">
                                    {selectedMember.fullName}
                                </span>

                                <span className="text-zinc-500">이메일</span>
                                <span className="text-zinc-900 dark:text-white">
                                    {selectedMember.email}
                                </span>

                                <span className="text-zinc-500">직급</span>
                                <span className="text-zinc-900 dark:text-white">
                                    {selectedMember.positionName || '-'}
                                </span>

                                <span className="text-zinc-500">조직</span>
                                <span className="text-zinc-900 dark:text-white">
                                    {getOrganizationName(selectedMember.organizationId)}
                                </span>

                                <span className="text-zinc-500">보안등급</span>
                                <span className={`inline-flex w-fit px-2 py-0.5 text-xs font-medium rounded-md border ${getSecurityLevelBadge(selectedMember.securityLevel)}`}>
                                    {selectedMember.securityLevel}
                                </span>

                                <span className="text-zinc-500">상위자</span>
                                <span className="text-zinc-900 dark:text-white">
                                    {getEmployeeName(selectedMember.parentId)}
                                </span>

                                <span className="text-zinc-500">가입일</span>
                                <span className="text-zinc-900 dark:text-white">
                                    {selectedMember.createdAt
                                        ? new Date(selectedMember.createdAt).toLocaleDateString('ko-KR')
                                        : '-'}
                                </span>
                            </div>

                            <div className="pt-2 border-t">
                                <p className="text-sm text-zinc-500 mb-2">고객 현황</p>
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="text-zinc-600 dark:text-zinc-400">
                                        전체 <span className="font-semibold text-zinc-900 dark:text-white">{selectedMember.customerCount}</span>명
                                    </span>
                                    <span className="text-purple-500">신규 {selectedMember.customersByStatus.new}</span>
                                    <span className="text-yellow-500">상담 {selectedMember.customersByStatus.consulting}</span>
                                    <span className="text-emerald-500">완료 {selectedMember.customersByStatus.closed}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
