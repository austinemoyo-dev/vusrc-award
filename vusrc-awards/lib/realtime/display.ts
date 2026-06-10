import { createBrowserClient } from '@supabase/ssr'
import type { DisplayState } from '@/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Strip /rest/v1 suffix that some project configs include — realtime needs the bare project URL
function projectUrl() {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/rest\/v1\/?$/, '')
}

let _client: ReturnType<typeof createBrowserClient> | null = null

function getClient() {
  if (!_client) {
    _client = createBrowserClient(projectUrl(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  }
  return _client
}

export function subscribeToDisplayState(
  callback: (state: DisplayState) => void
): RealtimeChannel {
  return getClient()
    .channel('display_state_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'display_state' },
      (payload: { new: unknown }) => callback(payload.new as DisplayState)
    )
    .subscribe()
}
