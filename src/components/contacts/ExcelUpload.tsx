import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, Download } from 'lucide-react'
import { parseExcelUpload, downloadTemplate } from '@/utils/contacts/excel'
import type { ContactInput } from '@/types/contact'

interface Props {
  onUpload: (contacts: ContactInput[], managerNames: Record<string, string>) => void
  isLoading?: boolean
}

export function ExcelUpload({ onUpload, isLoading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const { contacts, managerNames } = await parseExcelUpload(file)
      // Convert Map to Record for API
      const managerRecord: Record<string, string> = {}
      managerNames.forEach((name, index) => {
        managerRecord[String(index)] = name
      })
      onUpload(contacts, managerRecord)
    } catch (err) {
      alert('Excel 파일 파싱 실패: ' + (err instanceof Error ? err.message : '알 수 없는 오류'))
    }

    // Reset input
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={async () => await downloadTemplate()}>
        <Download className="h-4 w-4 mr-1" />
        템플릿
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={isLoading}
      >
        <Upload className="h-4 w-4 mr-1" />
        Excel 업로드
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
