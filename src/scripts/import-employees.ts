import 'dotenv/config'
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!)

// 등록할 담당자 목록 (이미지 + 시트 통합, 총 18명)
const EMPLOYEES_TO_IMPORT = [
  { fullName: '강문희', email: 'kangmh@temp.local' },
  { fullName: '김미영', email: 'kimmy@temp.local' },
  { fullName: '김민진', email: 'kimmj@temp.local' },
  { fullName: '김유라', email: 'kimyr@temp.local' },
  { fullName: '김진주', email: 'kimjj@temp.local' },
  { fullName: '김하람', email: 'kimhr@temp.local' },
  { fullName: '문재영', email: 'moonjy@temp.local' },
  { fullName: '박은정', email: 'parkej@temp.local' },
  { fullName: '박재성', email: 'parkjs@temp.local' },
  { fullName: '배연우', email: 'baeyw@temp.local' },
  { fullName: '오연수', email: 'ohys@temp.local' },
  { fullName: '오지연', email: 'ohjy@temp.local' },
  { fullName: '이남수', email: 'leens@temp.local' },
  { fullName: '이인선', email: 'leeis@temp.local' },
  { fullName: '이주화', email: 'leejh@temp.local' },
  { fullName: '이현경', email: 'leehk@temp.local' },
  { fullName: '임아름', email: 'limar@temp.local' },
  { fullName: '조세경', email: 'josk@temp.local' },
]

async function importEmployees() {
  console.log('=== 담당자 등록 시작 ===\n')

  try {
    // 기존 담당자 조회
    const existingEmployees = await sql`
      SELECT id, email, full_name FROM employees
    `

    const existingNames = new Set(existingEmployees.map(e => e.full_name))
    const existingEmails = new Set(existingEmployees.map(e => e.email))

    let created = 0
    let skipped = 0
    const skippedList: string[] = []

    for (const emp of EMPLOYEES_TO_IMPORT) {
      // 중복 체크 (이름 또는 이메일)
      if (existingNames.has(emp.fullName)) {
        skipped++
        skippedList.push(`${emp.fullName} (이름 중복)`)
        continue
      }
      if (existingEmails.has(emp.email)) {
        skipped++
        skippedList.push(`${emp.fullName} (이메일 중복)`)
        continue
      }

      // 새 담당자 등록
      try {
        await sql`
          INSERT INTO employees (email, full_name, security_level, is_active)
          VALUES (${emp.email}, ${emp.fullName}, 'F5', true)
        `
        console.log(`✅ ${emp.fullName} 등록 완료`)
        created++
        existingNames.add(emp.fullName)
        existingEmails.add(emp.email)
      } catch (err) {
        console.error(`❌ ${emp.fullName} 등록 실패:`, (err as Error).message)
      }
    }

    console.log('\n=== 등록 결과 ===')
    console.log(`신규 등록: ${created}명`)
    console.log(`건너뜀: ${skipped}명`)

    if (skippedList.length > 0) {
      console.log('\n건너뛴 담당자:')
      skippedList.forEach(name => console.log(`  - ${name}`))
    }

    // 최종 담당자 목록 출력
    const finalEmployees = await sql`
      SELECT id, full_name, email, security_level
      FROM employees
      ORDER BY full_name
    `

    console.log('\n=== 현재 등록된 담당자 목록 ===')
    finalEmployees.forEach((emp, i) => {
      console.log(`${i + 1}. ${emp.full_name} (${emp.email}) - ${emp.security_level}`)
    })

  } finally {
    await sql.end()
  }
}

importEmployees()
