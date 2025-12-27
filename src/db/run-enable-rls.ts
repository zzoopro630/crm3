import postgres from 'postgres'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL이 설정되지 않았습니다.')
    process.exit(1)
}

async function main() {
    const sql = postgres(DATABASE_URL as string)

    try {
        const sqlContent = fs.readFileSync(
            path.join(__dirname, 'enable-all-rls.sql'),
            'utf-8'
        )

        console.log('🔐 RLS 활성화 시작...')

        // SQL 파일 내용을 직접 실행
        await sql.unsafe(sqlContent)

        console.log('✅ RLS 활성화 완료!')
        console.log('모든 테이블에 Row Level Security가 적용되었습니다.')

    } catch (error) {
        console.error('❌ RLS 활성화 실패:', error)
        process.exit(1)
    } finally {
        await sql.end()
    }
}

main()
