/**
 * Database ENUM Migration Script
 * 
 * VARCHAR 컬럼을 PostgreSQL ENUM 타입으로 마이그레이션합니다.
 * 
 * 실행: npx tsx src/db/migrate-to-enums.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// 명령행 인자 확인
const args = process.argv.slice(2)
const sqlOnlyMode = args.includes('--sql-only')

let supabase: SupabaseClient | null = null

if (!sqlOnlyMode) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ 환경변수 설정 필요:')
        console.error('   VITE_SUPABASE_URL')
        console.error('   SUPABASE_SERVICE_ROLE_KEY')
        process.exit(1)
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey)
}


async function migrateToEnums() {
    console.log('🚀 Database ENUM 마이그레이션 시작...\n')

    const migrations = [
        // 1. ENUM 타입 생성
        {
            name: 'security_level_enum 생성',
            sql: `
                DO $$ BEGIN
                    CREATE TYPE security_level_enum AS ENUM ('F1', 'F2', 'F3', 'F4', 'F5', 'F6');
                EXCEPTION
                    WHEN duplicate_object THEN NULL;
                END $$;
            `
        },
        {
            name: 'customer_status_enum 생성',
            sql: `
                DO $$ BEGIN
                    CREATE TYPE customer_status_enum AS ENUM ('new', 'contacted', 'consulting', 'closed');
                EXCEPTION
                    WHEN duplicate_object THEN NULL;
                END $$;
            `
        },
        {
            name: 'gender_enum 생성',
            sql: `
                DO $$ BEGIN
                    CREATE TYPE gender_enum AS ENUM ('남성', '여성', '법인');
                EXCEPTION
                    WHEN duplicate_object THEN NULL;
                END $$;
            `
        },
        {
            name: 'approval_status_enum 생성',
            sql: `
                DO $$ BEGIN
                    CREATE TYPE approval_status_enum AS ENUM ('pending', 'approved', 'rejected');
                EXCEPTION
                    WHEN duplicate_object THEN NULL;
                END $$;
            `
        },
        // 2. 컬럼 타입 변경
        {
            name: 'employees.security_level → ENUM',
            sql: `
                ALTER TABLE employees 
                ALTER COLUMN security_level TYPE security_level_enum 
                USING security_level::security_level_enum;
            `,
            skipIfError: true // 이미 ENUM이면 스킵
        },
        {
            name: 'customers.status → ENUM',
            sql: `
                ALTER TABLE customers 
                ALTER COLUMN status TYPE customer_status_enum 
                USING status::customer_status_enum;
            `,
            skipIfError: true
        },
        {
            name: 'customers.gender → ENUM',
            sql: `
                ALTER TABLE customers 
                ALTER COLUMN gender TYPE gender_enum 
                USING gender::gender_enum;
            `,
            skipIfError: true
        },
        {
            name: 'pending_approvals.status → ENUM',
            sql: `
                ALTER TABLE pending_approvals 
                ALTER COLUMN status TYPE approval_status_enum 
                USING status::approval_status_enum;
            `,
            skipIfError: true
        },
    ]

    for (const migration of migrations) {
        try {
            console.log(`⏳ ${migration.name}...`)
            const { error } = await supabase!.rpc('exec_sql', { query: migration.sql })

            if (error) {
                if (migration.skipIfError) {
                    console.log(`   ⚠️ 스킵됨 (이미 적용됨)`)
                } else {
                    throw error
                }
            } else {
                console.log(`   ✅ 완료`)
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err)
            if (migration.skipIfError && errorMessage.includes('already')) {
                console.log(`   ⚠️ 스킵됨 (이미 적용됨)`)
            } else {
                console.error(`   ❌ 실패: ${errorMessage}`)
            }
        }
    }

    console.log('\n✨ 마이그레이션 완료!')
    console.log('\n📝 참고: Supabase에 exec_sql 함수가 없으면 SQL Editor에서 직접 실행하세요.')
}

// SQL만 출력하는 모드
function printSqlOnly() {
    console.log('-- ============================================')
    console.log('-- Database ENUM Types Migration')
    console.log('-- Supabase SQL Editor에서 직접 실행하세요')
    console.log('-- ============================================\n')

    console.log('-- 1. ENUM 타입 생성')
    console.log(`CREATE TYPE security_level_enum AS ENUM ('F1', 'F2', 'F3', 'F4', 'F5', 'F6');`)
    console.log(`CREATE TYPE customer_status_enum AS ENUM ('new', 'contacted', 'consulting', 'closed');`)
    console.log(`CREATE TYPE gender_enum AS ENUM ('남성', '여성', '법인');`)
    console.log(`CREATE TYPE approval_status_enum AS ENUM ('pending', 'approved', 'rejected');`)

    console.log('\n-- 2. employees 테이블')
    console.log(`ALTER TABLE employees `)
    console.log(`  ALTER COLUMN security_level TYPE security_level_enum `)
    console.log(`  USING security_level::security_level_enum;`)

    console.log('\n-- 3. customers 테이블')
    console.log(`ALTER TABLE customers `)
    console.log(`  ALTER COLUMN status TYPE customer_status_enum `)
    console.log(`  USING status::customer_status_enum;`)
    console.log(``)
    console.log(`ALTER TABLE customers `)
    console.log(`  ALTER COLUMN gender TYPE gender_enum `)
    console.log(`  USING gender::gender_enum;`)

    console.log('\n-- 4. pending_approvals 테이블')
    console.log(`ALTER TABLE pending_approvals `)
    console.log(`  ALTER COLUMN status TYPE approval_status_enum `)
    console.log(`  USING status::approval_status_enum;`)

    console.log('\n-- ============================================')
    console.log('-- 마이그레이션 완료 후 Drizzle 스키마 업데이트 필요')
    console.log('-- ============================================')
}

// 마이그레이션 실행 또는 SQL 출력
if (sqlOnlyMode) {
    printSqlOnly()
} else {
    migrateToEnums()
}
