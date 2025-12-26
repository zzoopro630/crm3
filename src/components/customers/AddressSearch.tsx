import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

declare global {
    interface Window {
        daum: {
            Postcode: new (options: {
                oncomplete: (data: DaumAddressData) => void
                width?: string
                height?: string
            }) => { open: () => void }
        }
    }
}

interface DaumAddressData {
    zonecode: string // 우편번호
    roadAddress: string // 도로명주소
    jibunAddress: string // 지번주소
    buildingName: string // 건물명
}

interface AddressSearchProps {
    value: string
    onChange: (address: string) => void
    placeholder?: string
}

export function AddressSearch({ value, onChange, placeholder = '주소 검색' }: AddressSearchProps) {
    const scriptLoaded = useRef(false)

    useEffect(() => {
        // Load Daum Postcode script
        if (!scriptLoaded.current && !document.getElementById('daum-postcode-script')) {
            const script = document.createElement('script')
            script.id = 'daum-postcode-script'
            script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
            script.async = true
            document.head.appendChild(script)
            scriptLoaded.current = true
        }
    }, [])

    const handleSearch = () => {
        if (typeof window.daum === 'undefined') {
            alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.')
            return
        }

        new window.daum.Postcode({
            oncomplete: (data: DaumAddressData) => {
                // 도로명주소 우선, 없으면 지번주소
                let fullAddress = data.roadAddress || data.jibunAddress

                // 건물명이 있으면 추가
                if (data.buildingName) {
                    fullAddress += ` (${data.buildingName})`
                }

                onChange(fullAddress)
            },
        }).open()
    }

    return (
        <div className="flex gap-2">
            <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="flex-1 bg-white dark:bg-zinc-800"
                readOnly
            />
            <Button type="button" variant="outline" onClick={handleSearch}>
                <Search className="h-4 w-4" />
            </Button>
        </div>
    )
}
