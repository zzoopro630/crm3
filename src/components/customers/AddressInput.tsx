import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, X, Loader2, MapPin } from 'lucide-react'

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

interface AddressInputProps {
    value: string
    onChange: (address: string) => void
    placeholder?: string
}

export function AddressInput({ value, onChange, placeholder = '주소 검색' }: AddressInputProps) {
    const [showFinder, setShowFinder] = useState(false)
    const [keyword, setKeyword] = useState('')
    const [results, setResults] = useState<AddressResult[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (showFinder) {
            inputRef.current?.focus()
        }
    }, [showFinder])

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
        onChange(result.roadAddr)
        setShowFinder(false)
        setKeyword('')
        setResults([])
    }

    const handleClose = () => {
        setShowFinder(false)
        setKeyword('')
        setResults([])
        setError('')
    }

    return (
        <div>
            <div className="flex gap-2">
                <Input
                    value={value}
                    readOnly
                    placeholder={placeholder}
                    className="flex-1 bg-zinc-50 dark:bg-zinc-800"
                />
                <Button type="button" variant="outline" onClick={() => setShowFinder(true)}>
                    <Search className="h-4 w-4" />
                </Button>
            </div>

            {/* 주소 검색 모달 */}
            {showFinder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleClose}>
                    <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 w-full max-w-lg max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">주소 검색</h3>
                            <Button variant="ghost" size="icon" onClick={handleClose}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

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
                                                        {result.zipNo}
                                                        {result.bdNm && ` · ${result.bdNm}`}
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
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
                    </div>
                </div>
            )}
        </div>
    )
}
