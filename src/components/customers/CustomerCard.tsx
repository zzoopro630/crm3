import { Link } from 'react-router-dom'
import { StatusSelector } from './StatusSelector'
import type { CustomerWithManager } from '@/types/customer'

interface CustomerCardProps {
    customer: CustomerWithManager
    canTransfer: boolean
    isSelected?: boolean
    onSelect?: (id: number, selected: boolean) => void
}

export function CustomerCard({
    customer,
    canTransfer,
    isSelected,
    onSelect,
}: CustomerCardProps) {
    return (
        <div
            className={`p-4 rounded-xl border transition-colors ${isSelected
                ? 'bg-primary/10 border-primary/30'
                : 'bg-card border-border hover:bg-secondary/30'
                }`}
        >
            {/* Header: 이름 + 상태 */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    {canTransfer && onSelect && (
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => onSelect(customer.id, e.target.checked)}
                            className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
                        />
                    )}
                    <Link
                        to={`/customers/${customer.id}`}
                        className="text-base font-medium text-foreground hover:text-primary"
                    >
                        {customer.name}
                    </Link>
                </div>
                <StatusSelector
                    customerId={customer.id}
                    currentStatus={customer.status}
                />
            </div>

            {/* Body: 정보 */}
            <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                    <span>전화번호</span>
                    {customer.phone ? (
                        <a
                            href={`tel:${customer.phone}`}
                            className="text-foreground hover:text-primary underline"
                        >
                            {customer.phone}
                        </a>
                    ) : (
                        <span className="text-foreground">-</span>
                    )}
                </div>
                <div className="flex items-center justify-between">
                    <span>유입경로</span>
                    <span className="text-foreground">{customer.source || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span>등록일</span>
                    <span>{customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('ko-KR') : '-'}</span>
                </div>
                {customer.latestNote && (
                    <div className="flex items-center justify-between">
                        <span>메모</span>
                        <span className="text-foreground truncate max-w-[200px]">{customer.latestNote}</span>
                    </div>
                )}
            </div>
        </div>
    )
}
