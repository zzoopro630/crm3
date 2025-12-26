import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useTeamMembers, useTransferCustomer } from '@/hooks/useTeam'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { ChevronDown, Search, Loader2, Check, UserCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ManagerSelectorProps {
    customerId: number
    currentManagerId: string
    currentManagerName: string | null
    onTransferSuccess?: () => void
}

// 이관 가능한 보안등급 (F5 이상만 가능, F6은 불가)
const TRANSFERABLE_LEVELS = ['F1', 'F2', 'F3', 'F4', 'F5']

export function ManagerSelector({
    customerId,
    currentManagerId,
    currentManagerName,
    onTransferSuccess,
}: ManagerSelectorProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    const { employee } = useAuthStore()
    const { data: teamMembers, isLoading } = useTeamMembers()
    const transferCustomer = useTransferCustomer()

    // 이관 권한 체크
    const canTransfer = employee && TRANSFERABLE_LEVELS.includes(employee.securityLevel)

    // 본인은 목록에서 제외하지 않음 (현재 담당자는 표시하되 선택 불가로 처리)
    const filteredMembers = (teamMembers || []).filter((member) => {
        if (!searchQuery) return true
        return (
            member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (member.positionName && member.positionName.toLowerCase().includes(searchQuery.toLowerCase()))
        )
    })

    const handleSelect = async (newManagerId: string) => {
        if (newManagerId === currentManagerId) {
            setIsOpen(false)
            return
        }

        try {
            await transferCustomer.mutateAsync({
                customerId,
                newManagerId,
            })
            setIsOpen(false)
            onTransferSuccess?.()
        } catch (error) {
            console.error('담당자 변경 실패:', error)
        }
    }

    // 권한이 없으면 단순 텍스트로 표시
    if (!canTransfer) {
        return (
            <span className="text-muted-foreground">
                {currentManagerName || '-'}
            </span>
        )
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button
                    className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 -mx-2 -my-1 rounded-md transition-colors",
                        "text-muted-foreground hover:bg-secondary hover:text-foreground",
                        "focus:outline-none focus:ring-2 focus:ring-primary/20",
                        transferCustomer.isPending && "opacity-50 pointer-events-none"
                    )}
                    disabled={transferCustomer.isPending}
                >
                    {transferCustomer.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                    ) : null}
                    <span>{currentManagerName || '미지정'}</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
                <div className="p-2 border-b border-border">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="이름으로 검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-8 text-sm"
                        />
                    </div>
                </div>
                <div className="max-h-60 overflow-y-auto p-1">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredMembers.length === 0 ? (
                        <div className="py-4 text-center text-sm text-muted-foreground">
                            {searchQuery ? '검색 결과가 없습니다' : '팀원이 없습니다'}
                        </div>
                    ) : (
                        filteredMembers.map((member) => {
                            const isCurrentManager = member.id === currentManagerId
                            return (
                                <button
                                    key={member.id}
                                    onClick={() => handleSelect(member.id)}
                                    disabled={isCurrentManager}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors",
                                        isCurrentManager
                                            ? "bg-primary/10 cursor-default"
                                            : "hover:bg-secondary"
                                    )}
                                >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                                        <UserCircle className="w-5 h-5 text-primary/60" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "text-sm font-medium truncate",
                                                isCurrentManager ? "text-primary" : "text-foreground"
                                            )}>
                                                {member.fullName}
                                            </span>
                                            <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                                                {member.securityLevel}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {member.positionName || member.department || member.email}
                                        </p>
                                    </div>
                                    {isCurrentManager && (
                                        <Check className="w-4 h-4 text-primary shrink-0" />
                                    )}
                                </button>
                            )
                        })
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
