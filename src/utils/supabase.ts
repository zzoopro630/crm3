import { createClient } from "@supabase/supabase-js";

// Declare global variables injected by Vite define
declare const __SUPABASE_URL__: string | undefined;
declare const __SUPABASE_ANON_KEY__: string | undefined;

// Fallback for Cloudflare Pages Preview deployments
const DEFAULT_SUPABASE_URL = "https://tawhqrixlhovysmrtgag.supabase.co";

// @ts-ignore
const supabaseUrl =
  (typeof __SUPABASE_URL__ !== "undefined" ? __SUPABASE_URL__ : undefined) ||
  import.meta.env.VITE_SUPABASE_URL ||
  DEFAULT_SUPABASE_URL;
// @ts-ignore
const supabaseAnonKey =
  (typeof __SUPABASE_ANON_KEY__ !== "undefined"
    ? __SUPABASE_ANON_KEY__
    : undefined) || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  throw new Error("Missing VITE_SUPABASE_ANON_KEY environment variable");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export function createSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}
