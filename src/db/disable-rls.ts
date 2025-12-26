import { config } from 'dotenv'
import postgres from 'postgres'

// Load .env.local
config({ path: '.env.local' })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL이 설정되지 않았습니다.')
    process.exit(1)
}

async function disableRLS() {
    console.log('🔓 Disabling RLS on all tables...')

    const sql = postgres(DATABASE_URL as string)

    try {
        // Disable RLS on all tables
        await sql`ALTER TABLE customers DISABLE ROW LEVEL SECURITY`
        console.log('✅ customers RLS disabled')

        await sql`ALTER TABLE employees DISABLE ROW LEVEL SECURITY`
        console.log('✅ employees RLS disabled')

        await sql`ALTER TABLE pending_approvals DISABLE ROW LEVEL SECURITY`
        console.log('✅ pending_approvals RLS disabled')

        await sql`ALTER TABLE sources DISABLE ROW LEVEL SECURITY`
        console.log('✅ sources RLS disabled')

        console.log('🔓 RLS disabled on all tables!')
    } catch (error) {
        console.error('Error:', error)
    } finally {
        await sql.end()
    }
}

disableRLS()
