import ExcelJS from 'exceljs'
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
    reader.onload = async (e) => {
      try {
        const buffer = e.target!.result as ArrayBuffer
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.load(buffer)
        const sheet = workbook.worksheets[0]

        const contacts: ContactInput[] = []
        const managerNames = new Map<number, string>()

        // 첫 행은 헤더
        const headers: string[] = []
        sheet.getRow(1).eachCell((cell, colNumber) => {
          headers[colNumber] = String(cell.value || '').trim()
        })

        const colMap = {
          name: headers.indexOf('이름') + 1 || headers.findIndex(h => h === '이름') + 1,
          title: headers.indexOf('직급') + 1 || headers.findIndex(h => h === '직급') + 1,
          team: headers.indexOf('팀') + 1 || headers.findIndex(h => h === '팀') + 1,
          phone: headers.indexOf('전화번호') + 1 || headers.findIndex(h => h === '전화번호') + 1,
          manager: headers.indexOf('상위자') + 1 || headers.findIndex(h => h === '상위자') + 1,
        }

        sheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return // 헤더 스킵

          const name = String(row.getCell(colMap.name).value || '').trim()
          const phone = String(row.getCell(colMap.phone).value || '').trim()
          if (!name || !phone) return

          const title = String(row.getCell(colMap.title).value || '').trim() as JobTitle | ''
          const validTitle = title && JOB_TITLES.includes(title as JobTitle) ? (title as JobTitle) : null

          contacts.push({
            name,
            title: validTitle,
            team: String(row.getCell(colMap.team).value || '').trim() || '미지정',
            phone,
          })

          const managerName = String(row.getCell(colMap.manager).value || '').trim()
          if (managerName) {
            managerNames.set(contacts.length - 1, managerName)
          }
        })

        resolve({ contacts, managerNames })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('파일 읽기 실패'))
    reader.readAsArrayBuffer(file)
  })
}

export async function downloadTemplate() {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('연락처')

  sheet.columns = [
    { header: '이름', key: 'name', width: 15 },
    { header: '직급', key: 'title', width: 12 },
    { header: '팀', key: 'team', width: 15 },
    { header: '전화번호', key: 'phone', width: 18 },
    { header: '상위자', key: 'manager', width: 15 },
  ]

  sheet.addRow({ name: '홍길동', title: '대표', team: '경영지원', phone: '01012345678', manager: '' })
  sheet.addRow({ name: '김철수', title: '팀장', team: '영업1팀', phone: '01098765432', manager: '홍길동' })

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '연락처_템플릿.xlsx'
  a.click()
  URL.revokeObjectURL(url)
}
