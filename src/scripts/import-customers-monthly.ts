import 'dotenv/config'
import { google } from 'googleapis'
import { readFileSync } from 'fs'
import { join } from 'path'
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!)
const SHEET_ID = '***REMOVED***'

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

// 상태 매핑
const STATUS_MAP: Record<string, string> = {
  '통화완료': 'contacted',
  '문자남김': 'texted',
  '부재': 'no_answer',
  '거절': 'rejected',
  '결번': 'wrong_number',
  '': 'new',
}

async function importFromMonthlyTabs() {
  console.log('=== 월별 탭에서 고객 데이터 Import ===\n')

  try {
    // 1. Google Sheets 인증
    const keyPath = join(process.cwd(), '***REMOVED***.json')
    const credentials = JSON.parse(readFileSync(keyPath, 'utf-8'))
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })
    const sheets = google.sheets({ version: 'v4', auth })

    // 2. 담당자 매핑 테이블
    const employees = await sql`SELECT id, full_name FROM employees`
    const managerMap = new Map<string, string>()
    employees.forEach(emp => {
      managerMap.set(emp.full_name, emp.id)
    })
    console.log(`담당자 ${managerMap.size}명 로드 완료\n`)

    // 3. 중복 체크용 Set
    const existingSet = new Set<string>()

    let totalCreated = 0
    let totalSkipped = 0
    let totalErrors = 0

    // 4. 각 월별 탭에서 데이터 Import
    for (const tab of MONTHLY_TABS) {
      console.log(`--- ${tab} 탭 처리 중 ---`)

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `'${tab}'!A:N`, // A~N 컬럼
      })

      const rows = response.data.values || []
      const dataRows = rows.slice(2) // 헤더 2행 제외

      let created = 0
      let skipped = 0

      for (const row of dataRows) {
        if (!row || row.length < 5) continue

        const [
          _no,           // A: NO.
          createdAtRaw,  // B: 분배일자
          managerName,   // C: 담당자
          name,          // D: 고객명
          phone,         // E: 연락처
          source,        // F: 유입
          interestProduct, // G: 관심항목
          statusRaw,     // H: 컨택여부
          _consulting,   // I: 상담진행
          _proposal,     // J: 설계안발송
          contractStatus, // K: 청약완료
          _upsell,       // L: 추가제안서
          memo,          // M: 메모
          adminComment,  // N: 관리자 코멘트
        ] = row

        // 필수값 체크
        if (!name || !managerName) continue
        if (name.includes('고객명') || managerName === '담당자') continue

        // 담당자 ID 찾기
        const managerId = managerMap.get(managerName)
        if (!managerId) {
          totalErrors++
          continue
        }

        // 상태 변환 (K열에 값이 있으면 청약완료=closed)
        let status = STATUS_MAP[statusRaw?.trim() || ''] || 'new'
        if (contractStatus && contractStatus.trim()) {
          status = 'closed'
        }

        // 날짜 파싱
        let createdAt: Date | null = null
        if (createdAtRaw) {
          const parsed = new Date(createdAtRaw)
          if (!isNaN(parsed.getTime())) {
            createdAt = parsed
          }
        }

        // 중복 체크 (이름+전화번호)
        const key = `${name}|${phone}`
        if (existingSet.has(key)) {
          skipped++
          totalSkipped++
          continue
        }

        // 신규 등록
        try {
          await sql`
            INSERT INTO customers (
              manager_id, name, phone, source, interest_product,
              status, type, memo, admin_comment, created_at
            ) VALUES (
              ${managerId},
              ${name},
              ${phone || null},
              ${source || null},
              ${interestProduct || null},
              ${status},
              'db',
              ${memo || null},
              ${adminComment || null},
              ${createdAt || sql`NOW()`}
            )
          `
          created++
          totalCreated++
          existingSet.add(key)
        } catch (err) {
          totalErrors++
        }
      }

      console.log(`  등록: ${created}건, 중복 건너뜀: ${skipped}건`)
    }

    // 5. 결과 출력
    console.log('\n=== Import 결과 ===')
    console.log(`총 등록: ${totalCreated}건`)
    console.log(`중복 건너뜀: ${totalSkipped}건`)
    console.log(`오류: ${totalErrors}건`)

    // 6. 전화번호 샘플 확인
    const sample = await sql`
      SELECT name, phone, source
      FROM customers
      WHERE type = 'db'
      ORDER BY created_at DESC
      LIMIT 5
    `
    console.log('\n=== 전화번호 샘플 확인 ===')
    sample.forEach(c => console.log(`  ${c.name}: ${c.phone} (${c.source})`))

  } finally {
    await sql.end()
  }
}

importFromMonthlyTabs()
