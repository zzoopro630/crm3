import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// For server-side usage (Cloudflare Pages Functions)
// Note: This will be used in API routes, not in frontend
export function createDb(connectionString: string) {
    const client = postgres(connectionString)
    return drizzle(client, { schema })
}

// Re-export schema for convenience
export * from './schema'
