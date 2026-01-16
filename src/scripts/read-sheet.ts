import { google } from 'googleapis'
import { readFileSync } from 'fs'
import { join } from 'path'

const SHEET_ID = '***REMOVED***'

async function readSheet() {
  // 서비스 계정 키 로드
  const keyPath = join(process.cwd(), '***REMOVED***.json')
  const credentials = JSON.parse(readFileSync(keyPath, 'utf-8'))

  // Google Auth 설정
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })

  const sheets = google.sheets({ version: 'v4', auth })

  try {
    // 시트 메타데이터 조회 (모든 탭 목록)
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
    })

    console.log('=== 시트 정보 ===')
    console.log('제목:', metadata.data.properties?.title)
    console.log('\n=== 탭 목록 ===')
    metadata.data.sheets?.forEach((sheet, i) => {
      console.log(`${i + 1}. ${sheet.properties?.title} (gid: ${sheet.properties?.sheetId})`)
    })

    // 첫 번째 탭의 헤더와 샘플 데이터 조회
    const firstSheet = metadata.data.sheets?.[0]?.properties?.title
    if (firstSheet) {
      console.log(`\n=== "${firstSheet}" 탭 데이터 (첫 10행) ===`)
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${firstSheet}!A1:Z10`,
      })

      const rows = response.data.values || []
      rows.forEach((row, i) => {
        console.log(`행 ${i + 1}:`, row.join(' | '))
      })
    }

    // gid=1644559844 탭도 확인
    const targetSheet = metadata.data.sheets?.find(s => s.properties?.sheetId === 1644559844)
    if (targetSheet && targetSheet.properties?.title !== firstSheet) {
      const targetTitle = targetSheet.properties?.title
      console.log(`\n=== "${targetTitle}" 탭 데이터 (첫 10행) ===`)
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${targetTitle}!A1:Z10`,
      })

      const rows = response.data.values || []
      rows.forEach((row, i) => {
        console.log(`행 ${i + 1}:`, row.join(' | '))
      })
    }

  } catch (error) {
    console.error('오류:', error)
  }
}

readSheet()
