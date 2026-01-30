import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import { employees } from './schema'

// Load .env.local
config({ path: '.env.local' })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL이 설정되지 않았습니다.')
    process.exit(1)
}

async function seed() {
    console.log('🌱 Seeding database...')

    const db = drizzle(DATABASE_URL as string)

    // 최초 관리자 등록 - 본인 이메일로 변경하세요!
    const adminEmail = process.argv[2]
    const adminName = process.argv[3] || '관리자'

    if (!adminEmail) {
        console.error('❌ 사용법: npx tsx src/db/seed.ts <이메일> [이름]')
        console.error('   예시: npx tsx src/db/seed.ts admin@gmail.com 홍길동')
        process.exit(1)
    }

    try {
        const result = await db.insert(employees).values({
            email: adminEmail,
            fullName: adminName,
            securityLevel: 'F1',
            positionName: '최고관리자',
        }).returning()

        console.log('✅ 관리자 등록 완료:', result[0])
    } catch (error: unknown) {
        if (error instanceof Error && error.message.includes('duplicate')) {
            console.log('ℹ️ 이미 등록된 이메일입니다.')
        } else {
            throw error
        }
    }

    await (db as unknown as { $client: { end: () => Promise<void> } }).$client.end()
    console.log('🌱 Seeding complete!')
}

seed().catch(console.error)
