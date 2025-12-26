import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

// 한국인 이름 샘플
const lastNames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍']
const firstNames = ['민준', '서연', '지훈', '하은', '예준', '수빈', '도윤', '지유', '시우', '다은', '준우', '서현', '민서', '유진', '현우', '민지', '성현', '소연', '지원', '채원']

// 회사 샘플
const companies = ['삼성전자', 'LG전자', 'SK텔레콤', '현대자동차', '네이버', '카카오', '쿠팡', '배달의민족', '토스', '야놀자', '당근마켓', '무신사', '마켓컬리', '오늘의집', '직방']

// 직급 샘플
const jobTitles = ['대표이사', '이사', '부장', '차장', '과장', '대리', '주임', '사원', '프리랜서', '자영업']

// 유입경로 샘플
const sources = ['광고', '소개', '홈페이지', '블로그', 'SNS', '전화문의', '방문상담', '지인추천', '기타']

// 도시 샘플
const cities = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '수원', '성남', '용인']

// 상태 샘플
const statuses = ['new', 'contacted', 'consulting', 'closed']

function getRandomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

function generatePhoneNumber(): string {
    const middle = String(Math.floor(1000 + Math.random() * 9000))
    const last = String(Math.floor(1000 + Math.random() * 9000))
    return `010-${middle}-${last}`
}

function generateBirthdate(): string {
    const year = 1970 + Math.floor(Math.random() * 35)  // 1970~2005
    const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')
    const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function generateEmail(index: number): string {
    const domains = ['gmail.com', 'naver.com', 'kakao.com', 'hanmail.net', 'daum.net']
    const romanized = `user${index}`
    return `${romanized}@${getRandomItem(domains)}`
}

async function seedCustomers() {
    console.log('🌱 한국인 샘플 고객 데이터 생성 중...')

    // 먼저 manager_id로 사용할 employee ID 조회
    const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id')
        .limit(1)

    if (empError) {
        console.error('❌ 직원 조회 실패:', empError)
        return
    }

    const managerId = employees?.[0]?.id
    if (!managerId) {
        console.error('❌ 먼저 사원을 등록해주세요 (npm run db:seed -- email name)')
        return
    }

    console.log(`📌 담당자 ID: ${managerId}`)

    const customers = []

    for (let i = 0; i < 30; i++) {
        const lastName = getRandomItem(lastNames)
        const firstName = getRandomItem(firstNames)
        const name = lastName + firstName

        customers.push({
            name,
            phone: generatePhoneNumber(),
            email: generateEmail(i + 1),
            address: `${getRandomItem(cities)}시 ${['강남', '서초', '송파', '마포', '영등포', '종로'][Math.floor(Math.random() * 6)]}구`,
            gender: Math.random() > 0.5 ? '남성' : '여성',
            birthdate: generateBirthdate(),
            company: Math.random() > 0.3 ? getRandomItem(companies) : null,
            job_title: Math.random() > 0.4 ? getRandomItem(jobTitles) : null,
            source: getRandomItem(sources),
            status: getRandomItem(statuses),
            manager_id: managerId,
        })
    }

    console.log(`📝 ${customers.length}개 고객 데이터 삽입 중...`)

    const { data, error } = await supabase
        .from('customers')
        .insert(customers)
        .select()

    if (error) {
        console.error('❌ 고객 데이터 삽입 실패:', error)
        return
    }

    console.log(`✅ ${data?.length || 0}명의 샘플 고객이 등록되었습니다!`)

    // 상태별 통계
    const statusCounts = customers.reduce((acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    console.log('\n📊 상태별 분포:')
    console.log(`   신규(new): ${statusCounts.new || 0}명`)
    console.log(`   연락완료(contacted): ${statusCounts.contacted || 0}명`)
    console.log(`   상담중(consulting): ${statusCounts.consulting || 0}명`)
    console.log(`   계약완료(closed): ${statusCounts.closed || 0}명`)
}

seedCustomers()
