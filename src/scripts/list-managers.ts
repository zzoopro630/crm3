import { google } from 'googleapis'
import { readFileSync } from 'fs'
import { join } from 'path'

const SHEET_ID = '1cfbJNuipEc1s93DFpTMLMIF4I8N35nfkfyqpA9q_Onc'

async function listManagers() {
  const keyPath = join(process.cwd(), 'thefirst-484508-11204d014662.json')
  const credentials = JSON.parse(readFileSync(keyPath, 'utf-8'))

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })

  const sheets = google.sheets({ version: 'v4', auth })

  // data 탭에서 전체 담당자 목록 추출
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'data!B:B', // 담당자 컬럼
  })

  const rows = response.data.values || []
  const managers = new Set<string>()

  rows.slice(2).forEach(row => { // 헤더 2행 제외
    if (row[0] && row[0].trim()) {
      managers.add(row[0].trim())
    }
  })

  console.log('=== 담당자 목록 (총', managers.size, '명) ===')
  Array.from(managers).sort().forEach((name, i) => {
    console.log(`${i + 1}. ${name}`)
  })

  // 총 데이터 건수
  console.log('\n=== 총 데이터 건수 ===')
  console.log('data 탭:', rows.length - 2, '건')
}

listManagers()
