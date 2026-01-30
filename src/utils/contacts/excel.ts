import * as XLSX from 'xlsx'
import type { ContactInput, JobTitle } from '@/types/contact'
import { JOB_TITLES } from '@/types/contact'

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return phone
}

interface ExcelRow {
  이름: string
  직급?: string
  팀?: string
  전화번호: string
  상위자?: string
}

/**
 * 2-pass Excel parsing:
 * Pass 1: Create contacts without managerId
 * Pass 2: Resolve manager names to IDs after bulk insert
 */
export function parseExcelUpload(
  file: File
): Promise<{ contacts: ContactInput[]; managerNames: Map<number, string> }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet)

        const contacts: ContactInput[] = []
        const managerNames = new Map<number, string>()

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]
          if (!row.이름 || !row.전화번호) continue

          const title = row.직급 as JobTitle | undefined
          const validTitle = title && JOB_TITLES.includes(title) ? title : null

          contacts.push({
            name: row.이름.trim(),
            title: validTitle,
            team: row.팀?.trim() || '미지정',
            phone: row.전화번호.toString().trim(),
          })

          if (row.상위자?.trim()) {
            managerNames.set(contacts.length - 1, row.상위자.trim())
          }
        }

        resolve({ contacts, managerNames })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('파일 읽기 실패'))
    reader.readAsArrayBuffer(file)
  })
}

export function downloadTemplate() {
  const data = [
    { 이름: '홍길동', 직급: '대표', 팀: '경영지원', 전화번호: '01012345678', 상위자: '' },
    { 이름: '김철수', 직급: '팀장', 팀: '영업1팀', 전화번호: '01098765432', 상위자: '홍길동' },
  ]
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '연락처')
  XLSX.writeFile(wb, '연락처_템플릿.xlsx')
}
