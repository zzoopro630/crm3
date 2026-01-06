import { config } from 'dotenv'
import postgres from 'postgres'

// Load .env.local
config({ path: '.env.local' })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL이 설정되지 않았습니다.')
    process.exit(1)
}

async function enableRLS() {
    console.log('🔐 Enabling Row Level Security (RLS)...')

    const client = postgres(DATABASE_URL as string)

    const tables = [
        'customers',
        'pending_approvals',
        'employees',
        'sources',
        'organizations',
        'customer_notes',
        'contracts'
    ]

    try {
        for (const table of tables) {
            // Enable RLS
            await client.unsafe(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`)
            console.log(`✅ RLS enabled on ${table}`)

            // Drop existing policies if any (to avoid conflicts)
            await client.unsafe(`
                DROP POLICY IF EXISTS "service_role_all_${table}" ON public.${table};
                DROP POLICY IF EXISTS "authenticated_read_${table}" ON public.${table};
            `)

            // Create service_role policy (full access)
            await client.unsafe(`
                CREATE POLICY "service_role_all_${table}" ON public.${table}
                FOR ALL USING (auth.role() = 'service_role');
            `)
            console.log(`   → Policy created: service_role_all_${table}`)

            // Create authenticated read policy
            await client.unsafe(`
                CREATE POLICY "authenticated_read_${table}" ON public.${table}
                FOR SELECT USING (auth.role() = 'authenticated');
            `)
            console.log(`   → Policy created: authenticated_read_${table}`)
        }

        console.log('\n🔐 RLS setup complete!')
    } catch (error) {
        console.error('❌ Error:', error)
        throw error
    } finally {
        await client.end()
    }
}

enableRLS().catch(console.error)
