import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Strip /rest/v1 suffix that is present in this project's NEXT_PUBLIC_SUPABASE_URL.
// @supabase/supabase-js appends /rest/v1 internally, so passing the raw env value
// produces a double path (e.g. /rest/v1//rest/v1) which causes PGRST125 errors.
function supabaseUrl() {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/rest\/v1\/?$/, '')
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    supabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from a Server Component — can be ignored
          }
        },
      },
    }
  )
}

export function createServiceClient() {
  return createServerClient(
    supabaseUrl(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return [] },
        setAll() {},
      },
    }
  )
}
