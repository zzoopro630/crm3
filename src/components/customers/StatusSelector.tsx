import { useState } from 'react'
import { useUpdateCustomer } from '@/hooks/useCustomers'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Loader2, ChevronDown } from 'lucide-react'
import { CUSTOMER_STATUSES } from '@/types/customer'

interface StatusSelectorProps {
    customerId: number
    currentStatus: string
}

// 상태별 스타일
function getStatusStyle(status: string) {
    switch (status) {
        case 'new':
            return { label: '신규', color: 'bg-blue-500/10 text-blue-500 border-blue-500/30' }
        case 'contacted':
            return { label: '연락완료', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' }
        case 'consulting':
            return { label: '상담중', color: 'bg-purple-500/10 text-purple-500 border-purple-500/30' }
        case 'closed':
            return { label: '계약완료', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' }
        case 'called':
            return { label: '통화완료', color: 'bg-lime-500/10 text-lime-500 border-lime-500/30' }
        case 'texted':
            return { label: '문자남김', color: 'bg-orange-500/10 text-orange-500 border-orange-500/30' }
        case 'no_answer':
            return { label: '부재', color: 'bg-zinc-400/10 text-zinc-400 border-zinc-400/30' }
        case 'rejected':
            return { label: '거절', color: 'bg-red-500/10 text-red-500 border-red-500/30' }
        case 'wrong_number':
            return { label: '결번', color: 'bg-zinc-800/10 text-zinc-800 dark:text-zinc-200 border-zinc-800/30' }
        case 'ineligible':
            return { label: '가입불가', color: 'bg-pink-500/10 text-pink-500 border-pink-500/30' }
        case 'upsell':
            return { label: '추가제안', color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30' }
        default:
            return { label: status, color: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/30' }
    }
}

export function StatusSelector({ customerId, currentStatus }: StatusSelectorProps) {
    const [isOpen, setIsOpen] = useState(false)
    const updateCustomer = useUpdateCustomer()

    const currentStyle = getStatusStyle(currentStatus)

    const handleSelect = async (newStatus: string) => {
        if (newStatus === currentStatus) {
            setIsOpen(false)
            return
        }

        try {
            await updateCustomer.mutateAsync({
                id: customerId,
                input: { status: newStatus },
            })
            setIsOpen(false)
        } catch (error) {
            console.error('상태 변경 실패:', error)
        }
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button
                    className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border cursor-pointer hover:opacity-80 transition-opacity ${currentStyle.color}`}
                    disabled={updateCustomer.isPending}
                >
                    {updateCustomer.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                        <>
                            {currentStyle.label}
                            <ChevronDown className="h-3 w-3" />
                        </>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1" align="start">
                <div className="space-y-1">
                    {CUSTOMER_STATUSES.map((status) => {
                        const style = getStatusStyle(status.value)
                        const isSelected = status.value === currentStatus
                        return (
                            <Button
                                key={status.value}
                                variant="ghost"
                                size="sm"
                                className={`w-full justify-start text-left ${isSelected ? 'bg-secondary' : ''}`}
                                onClick={() => handleSelect(status.value)}
                            >
                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${style.color}`}>
                                    {style.label}
                                </span>
                            </Button>
                        )
                    })}
                </div>
            </PopoverContent>
        </Popover>
    )
}
