import { createClient } from '@supabase/supabase-js'

// Fallback for Cloudflare Pages Preview deployments
// VITE_ prefixed env vars are only available in Production builds on Cloudflare Pages
const DEFAULT_SUPABASE_URL = 'https://tawhqrixlhovysmrtgag.supabase.co'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseAnonKey) {
    throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
})
