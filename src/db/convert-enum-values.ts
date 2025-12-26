/**
 * 기존 데이터를 ENUM 값으로 변환하는 스크립트
 * 
 * 실행: npx tsx src/db/convert-enum-values.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function convertEnumValues() {
    console.log('🔄 기존 데이터를 ENUM 값으로 변환 중...\n')

    // 1. customers.gender 변환 (male → 남성, female → 여성)
    console.log('📌 customers.gender 변환...')

    const { data: maleCustomers, error: maleError } = await supabase
        .from('customers')
        .update({ gender: '남성' })
        .eq('gender', 'male')
        .select('id')

    if (maleError) {
        console.error('   ❌ male → 남성 변환 실패:', maleError.message)
    } else {
        console.log(`   ✅ male → 남성: ${maleCustomers?.length || 0}건`)
    }

    const { data: femaleCustomers, error: femaleError } = await supabase
        .from('customers')
        .update({ gender: '여성' })
        .eq('gender', 'female')
        .select('id')

    if (femaleError) {
        console.error('   ❌ female → 여성 변환 실패:', femaleError.message)
    } else {
        console.log(`   ✅ female → 여성: ${femaleCustomers?.length || 0}건`)
    }

    const { data: corpCustomers, error: corpError } = await supabase
        .from('customers')
        .update({ gender: '법인' })
        .eq('gender', 'corporate')
        .select('id')

    if (corpError) {
        console.error('   ❌ corporate → 법인 변환 실패:', corpError.message)
    } else {
        console.log(`   ✅ corporate → 법인: ${corpCustomers?.length || 0}건`)
    }

    // 2. 변환 결과 확인
    console.log('\n📊 변환 결과 확인...')

    const { data: genderStats, error: statsError } = await supabase
        .from('customers')
        .select('gender')

    if (statsError) {
        console.error('❌ 통계 조회 실패:', statsError.message)
    } else {
        const counts: Record<string, number> = {}
        genderStats?.forEach(row => {
            const g = row.gender || 'null'
            counts[g] = (counts[g] || 0) + 1
        })
        console.log('   gender 분포:', counts)
    }

    console.log('\n✅ 변환 완료!')
    console.log('📝 이제 npm run db:push를 다시 실행하세요.')
}

convertEnumValues()
