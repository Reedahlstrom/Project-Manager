import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/types/models'

/**
 * The browser-side Supabase client.
 *
 * This client only ever holds the publishable (anon) key. Every read and write
 * it makes is filtered by row-level security using the signed-in user's JWT, so
 * the security boundary is the RLS policy in the database — not this file, and
 * not any check in the UI. If a policy is wrong, the UI cannot save it.
 *
 * The service role key must never reach this file. It belongs in Supabase Edge
 * Function secrets only.
 */

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill them in.'
  )
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
})
