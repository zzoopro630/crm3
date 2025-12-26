/**
 * 각 보안등급별 테스트 사원 데이터 생성 스크립트
 * 실행: npx tsx src/db/seed-test-employees.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// .env.local 파일 로드
config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const testEmployees = [
    {
        email: 'admin@example.com',
        full_name: '김관리',
        security_level: 'F1',
        position_name: '대표',
        department: '경영진',
    },
    {
        email: 'director@example.com',
        full_name: '이임원',
        security_level: 'F2',
        position_name: '이사',
        department: '경영지원',
    },
    {
        email: 'teamlead@example.com',
        full_name: '박팀장',
        security_level: 'F3',
        position_name: '팀장',
        department: '영업1팀',
    },
    {
        email: 'manager@example.com',
        full_name: '최과장',
        security_level: 'F4',
        position_name: '과장',
        department: '영업1팀',
    },
    {
        email: 'senior@example.com',
        full_name: '정대리',
        security_level: 'F5',
        position_name: '대리',
        department: '영업1팀',
    },
    {
        email: 'staff@example.com',
        full_name: '강사원',
        security_level: 'F6',
        position_name: 'FC',
        department: '영업1팀',
    },
]

async function seedTestEmployees() {
    console.log('테스트 사원 데이터 생성 시작...\n')

    for (const emp of testEmployees) {
        // 기존 사원 확인
        const { data: existing } = await supabase
            .from('employees')
            .select('id')
            .eq('email', emp.email)
            .single()

        if (existing) {
            console.log(`⏭️  ${emp.full_name} (${emp.security_level}) - 이미 존재함`)
            continue
        }

        // 새 사원 추가
        const { error } = await supabase.from('employees').insert({
            ...emp,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })

        if (error) {
            console.error(`❌ ${emp.full_name} (${emp.security_level}) 추가 실패:`, error.message)
        } else {
            console.log(`✅ ${emp.full_name} (${emp.security_level}) - ${emp.email}`)
        }
    }

    console.log('\n테스트 사원 데이터 생성 완료!')
    console.log('\n로그인 테스트 방법:')
    console.log('각 이메일로 Google OAuth 로그인하거나, Supabase Auth에서 직접 추가하세요.')
}

seedTestEmployees()
