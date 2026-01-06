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

// 상태별 스타일 - CSS 변수 사용
function getStatusStyle(status: string) {
    // 모노톤 블루/그레이 테마 - CSS 변수 기반
    const statusStyles: Record<string, { label: string; cssVar: string }> = {
        new: { label: '신규', cssVar: 'new' },
        contacted: { label: '연락완료', cssVar: 'contacted' },
        consulting: { label: '상담중', cssVar: 'consulting' },
        closed: { label: '청약완료', cssVar: 'closed' },
        called: { label: '통화완료', cssVar: 'contacted' },
        texted: { label: '문자남김', cssVar: 'texted' },
        no_answer: { label: '부재', cssVar: 'contacted' },
        rejected: { label: '거절', cssVar: 'rejected' },
        wrong_number: { label: '결번', cssVar: 'rejected' },
        ineligible: { label: '가입불가', cssVar: 'rejected' },
        upsell: { label: '추가제안', cssVar: 'recommend' },
    }

    const style = statusStyles[status] || { label: status, cssVar: 'new' }
    return {
        label: style.label,
        cssVar: style.cssVar
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
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                        backgroundColor: `var(--status-${currentStyle.cssVar}-bg)`,
                        color: `var(--status-${currentStyle.cssVar})`,
                        borderColor: `var(--status-${currentStyle.cssVar})`,
                    }}
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
                                <span
                                    className="inline-flex px-2 py-0.5 text-xs font-medium rounded border"
                                    style={{
                                        backgroundColor: `var(--status-${style.cssVar}-bg)`,
                                        color: `var(--status-${style.cssVar})`,
                                        borderColor: `var(--status-${style.cssVar})`,
                                    }}
                                >
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
