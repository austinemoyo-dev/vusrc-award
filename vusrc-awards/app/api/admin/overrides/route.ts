import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { createServiceClient } from '@/lib/supabase/server'
import { getAdminSession } from '@/lib/auth/session'
import bcrypt from 'bcryptjs'

/* ── GET: override history ───────────────────────────────────────────────── */

export async function GET() {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const supabase = createServiceClient()
  const [overridesRes, adminsRes, nomineesRes, catsRes] = await Promise.all([
    supabase.from('vote_overrides').select('*').order('performed_at', { ascending: false }),
    supabase.from('admins').select('id, email'),
    supabase.from('nominees').select('id, full_name'),
    supabase.from('categories').select('id, name'),
  ])

  const adminMap = new Map(
    (adminsRes.data ?? []).map((a) => [a.id as string, a.email as string])
  )
  const nomineeMap = new Map(
    (nomineesRes.data ?? []).map((n) => [n.id as string, n.full_name as string])
  )
  const catMap = new Map(
    (catsRes.data ?? []).map((c) => [c.id as string, c.name as string])
  )

  const history = (overridesRes.data ?? []).map((o) => ({
    id: o.id as string,
    performed_at: o.performed_at as string,
    admin_email: adminMap.get(o.superadmin_id as string) ?? 'Unknown',
    category_name: catMap.get(o.category_id as string) ?? 'Unknown',
    nominee_name: nomineeMap.get(o.nominee_id as string) ?? 'Unknown',
    transfer_to_nominee_name:
      (o.transfer_to_nominee_id as string | null)
        ? (nomineeMap.get(o.transfer_to_nominee_id as string) ?? null)
        : null,
    action: o.action as 'add' | 'remove' | 'transfer',
    votes_delta: o.votes_delta as number,
    reason: o.reason as string,
  }))

  return Response.json({ history })
}

/* ── POST: execute override ──────────────────────────────────────────────── */

type OverrideAction = 'add' | 'remove' | 'transfer'

interface OverrideBody {
  nomineeId?: string
  categoryId?: string
  action?: OverrideAction
  votesDelta?: number
  transferToNomineeId?: string
  reason?: string
  confirmedPassword?: string
}

export async function POST(request: NextRequest) {
  const { session, errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  let body: OverrideBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid body', code: 'bad_request' }, { status: 400 })
  }

  const { nomineeId, categoryId, action, votesDelta, transferToNomineeId, reason, confirmedPassword } = body

  // Validate required fields
  if (!nomineeId || !categoryId || !action || !votesDelta || !reason || !confirmedPassword) {
    return Response.json({ error: 'Missing required fields', code: 'bad_request' }, { status: 400 })
  }
  if (!['add', 'remove', 'transfer'].includes(action)) {
    return Response.json({ error: 'Invalid action', code: 'bad_request' }, { status: 400 })
  }
  if (votesDelta < 1) {
    return Response.json({ error: 'votesDelta must be at least 1', code: 'bad_request' }, { status: 400 })
  }
  if (reason.trim().length < 10) {
    return Response.json({ error: 'Reason must be at least 10 characters', code: 'bad_request' }, { status: 400 })
  }
  if (action === 'transfer' && !transferToNomineeId) {
    return Response.json({ error: 'transferToNomineeId required for transfer', code: 'bad_request' }, { status: 400 })
  }
  if (action === 'transfer' && transferToNomineeId === nomineeId) {
    return Response.json({ error: 'Cannot transfer to the same nominee', code: 'bad_request' }, { status: 400 })
  }

  // Re-verify password server-side (never trust client-side check alone)
  const supabase = createServiceClient()
  const { data: admin } = await supabase
    .from('admins')
    .select('password_hash')
    .eq('id', session.adminId)
    .maybeSingle()

  if (!admin) {
    return Response.json({ error: 'Admin not found', code: 'not_found' }, { status: 404 })
  }

  const passwordValid = await bcrypt.compare(confirmedPassword, admin.password_hash as string)
  if (!passwordValid) {
    return Response.json({ error: 'Incorrect password', code: 'wrong_password' }, { status: 403 })
  }

  // Fetch current nominee to validate remove/transfer limits
  const { data: nominee } = await supabase
    .from('nominees')
    .select('override_votes')
    .eq('id', nomineeId)
    .maybeSingle()

  if (!nominee) {
    return Response.json({ error: 'Nominee not found', code: 'not_found' }, { status: 404 })
  }

  const currentOverride = (nominee.override_votes as number) ?? 0

  // Transfers move real vote weight between nominees, so they cannot exceed
  // the source nominee's current total (organic + override).
  if (action === 'transfer') {
    const { count: organicCount } = await supabase
      .from('votes')
      .select('id', { count: 'exact', head: true })
      .eq('nominee_id', nomineeId)
    const currentTotal = (organicCount ?? 0) + currentOverride
    if (votesDelta > currentTotal) {
      return Response.json(
        { error: `Cannot transfer more than the nominee's current total (${currentTotal} votes)`, code: 'bad_request' },
        { status: 400 }
      )
    }
  }

  // Execute the override
  if (action === 'add') {
    const { error: dbErr } = await supabase
      .from('nominees')
      .update({ override_votes: currentOverride + votesDelta })
      .eq('id', nomineeId)
    if (dbErr) return Response.json({ error: `DB update failed: ${dbErr.message}` }, { status: 500 })
  } else if (action === 'remove') {
    const newVal = Math.max(0, currentOverride - votesDelta)
    const { error: dbErr } = await supabase
      .from('nominees')
      .update({ override_votes: newVal })
      .eq('id', nomineeId)
    if (dbErr) return Response.json({ error: `DB update failed: ${dbErr.message}` }, { status: 500 })
  } else if (action === 'transfer') {
    // Try RPC first, fall back to sequential updates
    const { error: rpcError } = await supabase.rpc('execute_override_transfer', {
      p_from_nominee_id: nomineeId,
      p_to_nominee_id: transferToNomineeId,
      p_delta: votesDelta,
    })
    if (rpcError) {
      // override_votes is a net adjustment and may go negative on the source —
      // a transfer must conserve total_votes (source -delta, target +delta).
      const newFrom = currentOverride - votesDelta
      const { error: e1 } = await supabase
        .from('nominees')
        .update({ override_votes: newFrom })
        .eq('id', nomineeId)
      if (e1) return Response.json({ error: `DB update failed: ${e1.message}` }, { status: 500 })

      const { data: toNom } = await supabase
        .from('nominees')
        .select('override_votes')
        .eq('id', transferToNomineeId)
        .maybeSingle()
      const toVal = ((toNom?.override_votes as number) ?? 0) + votesDelta
      const { error: e2 } = await supabase
        .from('nominees')
        .update({ override_votes: toVal })
        .eq('id', transferToNomineeId!)
      if (e2) return Response.json({ error: `DB update failed: ${e2.message}` }, { status: 500 })
    }
  }

  // Insert audit log
  const { error: auditError } = await supabase.from('vote_overrides').insert({
    superadmin_id: session.adminId,
    nominee_id: nomineeId,
    category_id: categoryId,
    action,
    votes_delta: votesDelta,
    reason: reason.trim(),
    transfer_to_nominee_id: action === 'transfer' ? transferToNomineeId : null,
    performed_at: new Date().toISOString(),
  })
  if (auditError) console.error('Failed to write vote_overrides audit log:', auditError.message)

  // Fetch updated total for this nominee
  const [{ data: updatedNominee }, voteCountRes] = await Promise.all([
    supabase.from('nominees').select('override_votes').eq('id', nomineeId).maybeSingle(),
    supabase.from('votes').select('id', { count: 'exact' }).eq('nominee_id', nomineeId),
  ])

  const organicVotes = voteCountRes.count ?? 0
  const overrideVotes = (updatedNominee?.override_votes as number) ?? 0
  const newTotal = organicVotes + overrideVotes

  // For transfers, also report the recipient's new total
  let transferToNewTotal: number | undefined
  if (action === 'transfer' && transferToNomineeId) {
    const [{ data: toNominee }, toVoteCountRes] = await Promise.all([
      supabase.from('nominees').select('override_votes').eq('id', transferToNomineeId).maybeSingle(),
      supabase.from('votes').select('id', { count: 'exact' }).eq('nominee_id', transferToNomineeId),
    ])
    const toOrganic = toVoteCountRes.count ?? 0
    const toOverride = (toNominee?.override_votes as number) ?? 0
    transferToNewTotal = toOrganic + toOverride
  }

  return Response.json({ success: true, newTotal, overrideVotes, organicVotes, transferToNewTotal })
}
