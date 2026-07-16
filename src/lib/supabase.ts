import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { DEV_MOCK } from '@/dev/env'
import { mockClient } from '@/dev/mockSupabase'

function realClient(): SupabaseClient {
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase env vars. Copy .env.example to .env.local and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    )
  }
  return createClient(url, anonKey)
}

// In mock mode, swap in the in-memory client — no network, no auth, no secrets.
// The literal `import.meta.env.DEV &&` lets the prod build fold this to
// `realClient()` and tree-shake the mock modules out entirely.
export const supabase: SupabaseClient =
  import.meta.env.DEV && DEV_MOCK
    ? (mockClient as unknown as SupabaseClient)
    : realClient()
