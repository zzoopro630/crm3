import { useState } from 'react'
import { useTeamMembers, useBulkTransferCustomers } from '@/hooks/useTeam'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Loader2, UserCircle, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BulkTransferModalProps {
    isOpen: boolean
    onClose: () => void
    selectedIds: number[]
    onSuccess: () => void
}

export function BulkTransferModal({
    isOpen,
    onClose,
    selectedIds,
    onSuccess,
}: BulkTransferModalProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null)

    const { data: teamMembers, isLoading } = useTeamMembers()
    const bulkTransfer = useBulkTransferCustomers()

    const filteredMembers = (teamMembers || []).filter((member) => {
        if (!searchQuery) return true
        return (
            member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (member.positionName && member.positionName.toLowerCase().includes(searchQuery.toLowerCase()))
        )
    })

    const handleTransfer = async () => {
        if (!selectedManagerId || selectedIds.length === 0) return

        try {
            await bulkTransfer.mutateAsync({
                customerIds: selectedIds,
                newManagerId: selectedManagerId,
            })
            onSuccess()
            handleClose()
        } catch (error) {
            console.error('대량 이관 실패:', error)
        }
    }

    const handleClose = () => {
        setSearchQuery('')
        setSelectedManagerId(null)
        onClose()
    }

    const selectedManager = teamMembers?.find(m => m.id === selectedManagerId)

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        담당자 일괄 변경
                    </DialogTitle>
                    <DialogDescription>
                        선택된 {selectedIds.length}명의 고객을 다른 담당자에게 이관합니다
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* 검색 */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="담당자 검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    {/* 담당자 목록 */}
                    <div className="border rounded-lg max-h-60 overflow-y-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : filteredMembers.length === 0 ? (
                            <div className="py-8 text-center text-sm text-muted-foreground">
                                {searchQuery ? '검색 결과가 없습니다' : '팀원이 없습니다'}
                            </div>
                        ) : (
                            <div className="divide-y">
                                {filteredMembers.map((member) => (
                                    <button
                                        key={member.id}
                                        onClick={() => setSelectedManagerId(member.id)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-3 text-left transition-colors",
                                            selectedManagerId === member.id
                                                ? "bg-primary/10"
                                                : "hover:bg-secondary"
                                        )}
                                    >
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                                            <UserCircle className="w-5 h-5 text-primary/60" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "text-sm font-medium truncate",
                                                    selectedManagerId === member.id && "text-primary"
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
                                        {selectedManagerId === member.id && (
                                            <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 선택된 담당자 표시 */}
                    {selectedManager && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                            <UserCircle className="w-5 h-5 text-primary" />
                            <span className="text-sm">
                                <strong>{selectedManager.fullName}</strong>에게 이관
                            </span>
                        </div>
                    )}
                </div>

                {/* 버튼 */}
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleClose}>
                        취소
                    </Button>
                    <Button
                        onClick={handleTransfer}
                        disabled={!selectedManagerId || bulkTransfer.isPending}
                    >
                        {bulkTransfer.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                이관 중...
                            </>
                        ) : (
                            `${selectedIds.length}명 이관`
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
