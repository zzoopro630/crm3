import postgres from 'postgres'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL이 설정되지 않았습니다.')
    process.exit(1)
}

async function main() {
    const sql = postgres(DATABASE_URL as string)

    try {
        console.log('🔐 추가 테이블 RLS 활성화 시작...')

        // organizations
        await sql`ALTER TABLE organizations ENABLE ROW LEVEL SECURITY`
        await sql`DROP POLICY IF EXISTS "Auth view organizations" ON organizations`
        await sql`CREATE POLICY "Auth view organizations" ON organizations FOR SELECT TO authenticated USING (true)`
        await sql`CREATE POLICY "Auth insert organizations" ON organizations FOR INSERT TO authenticated WITH CHECK (true)`
        await sql`CREATE POLICY "Auth update organizations" ON organizations FOR UPDATE TO authenticated USING (true)`
        console.log('✅ organizations RLS 완료')

        // pending_approvals
        await sql`ALTER TABLE pending_approvals ENABLE ROW LEVEL SECURITY`
        await sql`DROP POLICY IF EXISTS "Auth view pending_approvals" ON pending_approvals`
        await sql`CREATE POLICY "Auth view pending_approvals" ON pending_approvals FOR SELECT TO authenticated USING (true)`
        await sql`CREATE POLICY "Auth insert pending_approvals" ON pending_approvals FOR INSERT TO authenticated WITH CHECK (true)`
        await sql`CREATE POLICY "Auth update pending_approvals" ON pending_approvals FOR UPDATE TO authenticated USING (true)`
        await sql`CREATE POLICY "Auth delete pending_approvals" ON pending_approvals FOR DELETE TO authenticated USING (true)`
        console.log('✅ pending_approvals RLS 완료')

        // sources
        await sql`ALTER TABLE sources ENABLE ROW LEVEL SECURITY`
        await sql`DROP POLICY IF EXISTS "Auth view sources" ON sources`
        await sql`CREATE POLICY "Auth view sources" ON sources FOR SELECT TO authenticated USING (true)`
        await sql`CREATE POLICY "Auth insert sources" ON sources FOR INSERT TO authenticated WITH CHECK (true)`
        await sql`CREATE POLICY "Auth update sources" ON sources FOR UPDATE TO authenticated USING (true)`
        await sql`CREATE POLICY "Auth delete sources" ON sources FOR DELETE TO authenticated USING (true)`
        console.log('✅ sources RLS 완료')

        console.log('\n🎉 모든 테이블 RLS 활성화 완료!')

    } catch (error) {
        console.error('❌ RLS 활성화 실패:', error)
        process.exit(1)
    } finally {
        await sql.end()
    }
}

main()
