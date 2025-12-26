import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, X, Loader2 } from 'lucide-react'
import { KoreanAddressFinder } from 'slick-address-kr'

interface AddressInputProps {
    value: string
    onChange: (address: string) => void
    placeholder?: string
}

export function AddressInput({ value, onChange, placeholder = '주소 검색' }: AddressInputProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const finderRef = useRef<KoreanAddressFinder | null>(null)
    const [isSearching, setIsSearching] = useState(false)
    const [showFinder, setShowFinder] = useState(false)

    const handleOpenFinder = () => {
        setShowFinder(true)
        setIsSearching(true)
    }

    const handleCloseFinder = () => {
        if (finderRef.current) {
            finderRef.current.destroy()
            finderRef.current = null
        }
        setShowFinder(false)
        setIsSearching(false)
    }

    const handleSelectAddress = () => {
        if (finderRef.current) {
            const result = finderRef.current.getSelectedAddress()
            if (result) {
                const fullAddress = result.roadAddress + (result.detailAddress ? ` ${result.detailAddress}` : '')
                onChange(fullAddress)
                handleCloseFinder()
            }
        }
    }

    useEffect(() => {
        if (showFinder && containerRef.current && !finderRef.current) {
            finderRef.current = new KoreanAddressFinder({
                onSelect: () => {
                    // Do nothing here, we'll use the button to confirm
                }
            })
            finderRef.current.init(containerRef.current)
            setIsSearching(false)
        }

        return () => {
            if (finderRef.current) {
                finderRef.current.destroy()
                finderRef.current = null
            }
        }
    }, [showFinder])

    return (
        <div className="space-y-2">
            <Label>주소</Label>

            {!showFinder ? (
                <div className="flex gap-2">
                    <Input
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className="flex-1 bg-white dark:bg-zinc-800"
                        readOnly
                    />
                    <Button type="button" variant="outline" onClick={handleOpenFinder}>
                        <Search className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <div className="border rounded-lg p-4 bg-white dark:bg-zinc-900 space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">주소 검색</span>
                        <Button type="button" variant="ghost" size="icon" onClick={handleCloseFinder}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {isSearching ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                        </div>
                    ) : (
                        <>
                            <div
                                ref={containerRef}
                                className="min-h-[200px] border rounded bg-white dark:bg-zinc-800"
                            />
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={handleCloseFinder} className="flex-1">
                                    취소
                                </Button>
                                <Button type="button" onClick={handleSelectAddress} className="flex-1">
                                    선택
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
