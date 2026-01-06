import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Search, MapPin } from 'lucide-react'

interface AddressResult {
    roadAddr: string
    jibunAddr: string
    zipNo: string
    bdNm?: string
}

interface ApiResponse {
    results: {
        common: {
            totalCount: string
            errorCode: string
            errorMessage: string
        }
        juso?: AddressResult[]
    }
}

interface AddressSearchModalProps {
    onSelect: (address: { roadAddress: string; jibunAddress: string; zipcode: string }) => void
}

export function AddressSearchModal({ onSelect }: AddressSearchModalProps) {
    const [keyword, setKeyword] = useState('')
    const [results, setResults] = useState<AddressResult[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [totalCount, setTotalCount] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    const handleSearch = async () => {
        if (!keyword.trim()) return

        setIsLoading(true)
        setError('')
        setResults([])

        try {
            const response = await fetch(`/api/address/search?keyword=${encodeURIComponent(keyword)}`)
            const data: ApiResponse = await response.json()

            if (data.results?.common?.errorCode === '0') {
                setResults(data.results.juso || [])
                setTotalCount(parseInt(data.results.common.totalCount) || 0)
            } else {
                setError(data.results?.common?.errorMessage || '검색에 실패했습니다')
            }
        } catch (err) {
            console.error('Address search error:', err)
            setError('주소 검색 중 오류가 발생했습니다')
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault()
            handleSearch()
        }
    }

    const handleSelect = (result: AddressResult) => {
        onSelect({
            roadAddress: result.roadAddr,
            jibunAddress: result.jibunAddr,
            zipcode: result.zipNo,
        })
    }

    return (
        <div className="space-y-4">
            {/* 검색 입력 */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                        ref={inputRef}
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="도로명, 지번, 건물명 검색..."
                        className="pl-9"
                    />
                </div>
                <Button onClick={handleSearch} disabled={isLoading || !keyword.trim()}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '검색'}
                </Button>
            </div>

            {/* 에러 메시지 */}
            {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* 검색 결과 */}
            {results.length > 0 && (
                <div className="space-y-1">
                    <p className="text-xs text-zinc-500">검색 결과 {totalCount}건</p>
                    <div className="max-h-[300px] overflow-y-auto space-y-1">
                        {results.map((result, index) => (
                            <button
                                key={index}
                                onClick={() => handleSelect(result)}
                                className="w-full text-left p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                                <div className="flex items-start gap-2">
                                    <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                                            {result.roadAddr}
                                        </p>
                                        <p className="text-xs text-zinc-500 truncate">
                                            [지번] {result.jibunAddr}
                                        </p>
                                        <p className="text-xs text-zinc-400">
                                            우편번호: {result.zipNo}
                                            {result.bdNm && ` · ${result.bdNm}`}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 검색 안내 */}
            {!isLoading && results.length === 0 && !error && (
                <div className="text-center py-8 text-zinc-400 text-sm">
                    <p>도로명, 지번, 건물명을 입력해주세요</p>
                    <p className="text-xs mt-1">예: 테헤란로 123, 강남구 삼성동</p>
                </div>
            )}
        </div>
    )
}
