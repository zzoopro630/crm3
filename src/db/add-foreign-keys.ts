import { config } from 'dotenv'
import postgres from 'postgres'

// Load .env.local
config({ path: '.env.local' })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL이 설정되지 않았습니다.')
    process.exit(1)
}

async function addForeignKeys() {
    console.log('🔗 Adding foreign key constraints...')

    const sql = postgres(DATABASE_URL as string)

    try {
        // Add foreign key: customers.manager_id -> employees.id
        await sql`
      ALTER TABLE customers 
      ADD CONSTRAINT customers_manager_id_fkey 
      FOREIGN KEY (manager_id) REFERENCES employees(id)
    `
        console.log('✅ customers.manager_id -> employees.id FK added')

        // Add foreign key: employees.parent_id -> employees.id (self-reference)
        await sql`
      ALTER TABLE employees 
      ADD CONSTRAINT employees_parent_id_fkey 
      FOREIGN KEY (parent_id) REFERENCES employees(id)
    `
        console.log('✅ employees.parent_id -> employees.id FK added')

        // Add foreign key: pending_approvals.processed_by -> employees.id
        await sql`
      ALTER TABLE pending_approvals 
      ADD CONSTRAINT pending_approvals_processed_by_fkey 
      FOREIGN KEY (processed_by) REFERENCES employees(id)
    `
        console.log('✅ pending_approvals.processed_by -> employees.id FK added')

        console.log('🔗 All foreign key constraints added!')
    } catch (error: unknown) {
        if (error instanceof Error && error.message.includes('already exists')) {
            console.log('ℹ️ Foreign key already exists')
        } else {
            console.error('Error:', error)
        }
    } finally {
        await sql.end()
    }
}

addForeignKeys()
