import { createBrowserClient } from '@supabase/ssr'

// Strip /rest/v1 suffix — @supabase/supabase-js appends it internally.
function supabaseUrl() {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/rest\/v1\/?$/, '')
}

export function createClient() {
  return createBrowserClient(
    supabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
