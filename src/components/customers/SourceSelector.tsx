import { useState } from 'react'
import { useUpdateCustomer } from '@/hooks/useCustomers'
import { useSources } from '@/hooks/useSources'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Loader2, ChevronDown } from 'lucide-react'

interface SourceSelectorProps {
    customerId: number
    currentSource: string | null
}

export function SourceSelector({ customerId, currentSource }: SourceSelectorProps) {
    const [isOpen, setIsOpen] = useState(false)
    const updateCustomer = useUpdateCustomer()
    const { data: sources } = useSources()

    const handleSelect = async (newSource: string) => {
        if (newSource === currentSource) {
            setIsOpen(false)
            return
        }

        try {
            await updateCustomer.mutateAsync({
                id: customerId,
                input: { source: newSource },
            })
            setIsOpen(false)
        } catch (error) {
            console.error('유입경로 변경 실패:', error)
        }
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                    disabled={updateCustomer.isPending}
                >
                    {updateCustomer.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                        <>
                            {currentSource || '미설정'}
                            <ChevronDown className="h-3 w-3" />
                        </>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="start">
                <div className="space-y-1 max-h-60 overflow-y-auto">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`w-full justify-start text-left ${!currentSource ? 'bg-secondary' : ''}`}
                        onClick={() => handleSelect('')}
                    >
                        <span className="text-zinc-400">미설정</span>
                    </Button>
                    {sources?.map((source) => {
                        const isSelected = source.name === currentSource
                        return (
                            <Button
                                key={source.id}
                                variant="ghost"
                                size="sm"
                                className={`w-full justify-start text-left ${isSelected ? 'bg-secondary' : ''}`}
                                onClick={() => handleSelect(source.name)}
                            >
                                {source.name}
                            </Button>
                        )
                    })}
                </div>
            </PopoverContent>
        </Popover>
    )
}
