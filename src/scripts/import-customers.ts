import 'dotenv/config'
import { google } from 'googleapis'
import { readFileSync } from 'fs'
import { join } from 'path'
import postgres from 'postgres'
import * as readline from 'readline'

const sql = postgres(process.env.DATABASE_URL!)
const SHEET_ID = '1cfbJNuipEc1s93DFpTMLMIF4I8N35nfkfyqpA9q_Onc'

// 상태 매핑
const STATUS_MAP: Record<string, string> = {
  '통화완료': 'contacted',
  '문자남김': 'texted',
  '부재': 'no_answer',
  '거절': 'rejected',
  '결번': 'wrong_number',
  '': 'new',
}

// 사용자 입력 받기
function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer.trim().toLowerCase())
    })
  })
}

async function importCustomers() {
  console.log('=== 고객 데이터 Import 시작 ===\n')

  try {
    // 1. Google Sheets 인증
    const keyPath = join(process.cwd(), 'thefirst-484508-11204d014662.json')
    const credentials = JSON.parse(readFileSync(keyPath, 'utf-8'))
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })
    const sheets = google.sheets({ version: 'v4', auth })

    // 2. 담당자 매핑 테이블 생성
    const employees = await sql`SELECT id, full_name FROM employees`
    const managerMap = new Map<string, string>()
    employees.forEach(emp => {
      managerMap.set(emp.full_name, emp.id)
    })
    console.log(`담당자 ${managerMap.size}명 로드 완료`)

    // 3. 시트 데이터 읽기
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'data!A:J', // A~J 컬럼
    })

    const rows = response.data.values || []
    const dataRows = rows.slice(2) // 헤더 2행 제외
    console.log(`시트에서 ${dataRows.length}건 데이터 로드\n`)

    // 4. 기존 고객 조회 (중복 체크용)
    const existingCustomers = await sql`
      SELECT name, phone FROM customers
    `
    const existingSet = new Set(
      existingCustomers.map(c => `${c.name}|${c.phone}`)
    )

    // 5. Import 실행
    let created = 0
    let skipped = 0
    let updated = 0
    const errors: string[] = []
    let duplicateAction: 'skip' | 'overwrite' | 'ask' = 'ask'

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      if (!row || row.length < 4) continue

      const [
        createdAtRaw,  // A: 분배일자
        managerName,   // B: 담당자
        name,          // C: 고객명
        phone,         // D: 연락처
        source,        // E: 유입경로
        interestProduct, // F: 관심항목
        statusRaw,     // G: 처리현황/컨택여부
      ] = row

      // 필수값 체크
      if (!name || name === '고*명' || name === '고객명') continue
      if (!managerName || managerName === '담당자') continue

      // 담당자 ID 찾기
      const managerId = managerMap.get(managerName)
      if (!managerId) {
        errors.push(`[${i + 3}행] 담당자 "${managerName}" 없음: ${name}`)
        continue
      }

      // 상태 변환
      const status = STATUS_MAP[statusRaw?.trim() || ''] || 'new'

      // 날짜 파싱
      let createdAt: Date | null = null
      if (createdAtRaw) {
        const parsed = new Date(createdAtRaw)
        if (!isNaN(parsed.getTime())) {
          createdAt = parsed
        }
      }

      // 중복 체크
      const key = `${name}|${phone}`
      if (existingSet.has(key)) {
        if (duplicateAction === 'ask') {
          console.log(`\n⚠️  중복 발견: ${name} (${phone})`)
          const answer = await prompt('처리 방법? (s=건너뛰기, o=덮어쓰기, sa=모두 건너뛰기, oa=모두 덮어쓰기): ')

          if (answer === 'sa') {
            duplicateAction = 'skip'
            skipped++
            continue
          } else if (answer === 'oa') {
            duplicateAction = 'overwrite'
          } else if (answer === 's') {
            skipped++
            continue
          }
          // 'o' 또는 'oa'면 아래에서 업데이트
        } else if (duplicateAction === 'skip') {
          skipped++
          continue
        }

        // 덮어쓰기
        await sql`
          UPDATE customers SET
            manager_id = ${managerId},
            source = ${source || null},
            interest_product = ${interestProduct || null},
            status = ${status},
            type = 'db',
            updated_at = NOW()
          WHERE name = ${name} AND phone = ${phone}
        `
        updated++
        continue
      }

      // 신규 등록
      try {
        await sql`
          INSERT INTO customers (
            manager_id, name, phone, source, interest_product, status, type, created_at
          ) VALUES (
            ${managerId},
            ${name},
            ${phone || null},
            ${source || null},
            ${interestProduct || null},
            ${status},
            'db',
            ${createdAt || sql`NOW()`}
          )
        `
        created++
        existingSet.add(key)

        if (created % 50 === 0) {
          console.log(`... ${created}건 등록 완료`)
        }
      } catch (err) {
        errors.push(`[${i + 3}행] ${name}: ${(err as Error).message}`)
      }
    }

    // 6. 결과 출력
    console.log('\n=== Import 결과 ===')
    console.log(`신규 등록: ${created}건`)
    console.log(`업데이트: ${updated}건`)
    console.log(`건너뜀: ${skipped}건`)
    console.log(`오류: ${errors.length}건`)

    if (errors.length > 0) {
      console.log('\n=== 오류 목록 ===')
      errors.slice(0, 20).forEach(e => console.log(e))
      if (errors.length > 20) {
        console.log(`... 외 ${errors.length - 20}건`)
      }
    }

    // 7. 담당자별 통계
    const stats = await sql`
      SELECT e.full_name, COUNT(c.id) as count
      FROM employees e
      LEFT JOIN customers c ON c.manager_id = e.id
      GROUP BY e.id, e.full_name
      ORDER BY count DESC
    `
    console.log('\n=== 담당자별 고객 수 ===')
    stats.forEach(s => {
      if (Number(s.count) > 0) {
        console.log(`${s.full_name}: ${s.count}명`)
      }
    })

  } finally {
    await sql.end()
  }
}

importCustomers()
