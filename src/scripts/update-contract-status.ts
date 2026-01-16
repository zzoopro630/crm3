import 'dotenv/config'
import { google } from 'googleapis'
import { readFileSync } from 'fs'
import { join } from 'path'
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!)
const SHEET_ID = '1cfbJNuipEc1s93DFpTMLMIF4I8N35nfkfyqpA9q_Onc'

// 월별 탭 목록
const MONTHLY_TABS = [
  '2025-04',
  '2025-05',
  '2025-06',
  '2025-07',
  '2025-08',
  '2025-09',
  '2025-10',
  '2025-11',
  '2025-12',
  '2026-01',
]

async function updateContractStatus() {
  console.log('=== 청약완료 상태 업데이트 ===\n')

  try {
    // 1. Google Sheets 인증
    const keyPath = join(process.cwd(), 'thefirst-484508-11204d014662.json')
    const credentials = JSON.parse(readFileSync(keyPath, 'utf-8'))
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })
    const sheets = google.sheets({ version: 'v4', auth })

    let totalUpdated = 0
    let totalNotFound = 0

    // 2. 각 월별 탭에서 청약완료 고객 찾기
    for (const tab of MONTHLY_TABS) {
      console.log(`--- ${tab} 탭 처리 중 ---`)

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `'${tab}'!A:N`, // A~N 컬럼
      })

      const rows = response.data.values || []
      const dataRows = rows.slice(2) // 헤더 2행 제외

      let updated = 0
      let notFound = 0

      for (const row of dataRows) {
        if (!row || row.length < 11) continue

        const [
          _no,           // A: NO.
          _createdAtRaw, // B: 분배일자
          _managerName,  // C: 담당자
          name,          // D: 고객명
          phone,         // E: 연락처
          _source,       // F: 유입
          _interestProduct, // G: 관심항목
          _statusRaw,    // H: 컨택여부
          _consulting,   // I: 상담진행
          _proposal,     // J: 설계안발송
          contractStatus, // K: 청약완료
        ] = row

        // 필수값 체크
        if (!name) continue
        if (name.includes('고객명')) continue

        // K열에 값이 있으면 청약완료로 업데이트
        if (contractStatus && contractStatus.trim()) {
          // 이름과 전화번호로 고객 찾아서 업데이트
          const result = await sql`
            UPDATE customers
            SET status = 'closed', updated_at = NOW()
            WHERE name = ${name}
              AND (phone = ${phone || null} OR (phone IS NULL AND ${!phone}))
              AND type = 'db'
              AND status != 'closed'
            RETURNING id
          `

          if (result.length > 0) {
            updated++
            totalUpdated++
            console.log(`  ✓ ${name} (${phone || '번호없음'}) → 청약완료`)
          } else {
            // 이미 closed이거나 찾지 못함
            const existing = await sql`
              SELECT id, status FROM customers
              WHERE name = ${name}
                AND (phone = ${phone || null} OR (phone IS NULL AND ${!phone}))
                AND type = 'db'
            `
            if (existing.length === 0) {
              notFound++
              totalNotFound++
            }
          }
        }
      }

      if (updated > 0 || notFound > 0) {
        console.log(`  업데이트: ${updated}건, 미발견: ${notFound}건`)
      }
    }

    // 3. 결과 출력
    console.log('\n=== 업데이트 결과 ===')
    console.log(`총 업데이트: ${totalUpdated}건`)
    console.log(`미발견: ${totalNotFound}건`)

    // 4. 청약완료 고객 목록 확인
    const closedCustomers = await sql`
      SELECT name, phone, source
      FROM customers
      WHERE type = 'db' AND status = 'closed'
      ORDER BY updated_at DESC
      LIMIT 10
    `
    console.log('\n=== 청약완료 고객 샘플 ===')
    closedCustomers.forEach(c => console.log(`  ${c.name}: ${c.phone} (${c.source})`))

  } finally {
    await sql.end()
  }
}

updateContractStatus()
