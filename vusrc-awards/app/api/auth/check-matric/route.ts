import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isRateLimited, getClientIp } from '@/lib/utils/rate-limit'

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  if (isRateLimited(`check-matric:${ip}`, 10, 60_000)) {
    return Response.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 })
  }

  let body: { matricNumber?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  // "matricNumber" holds whichever identifier the student typed (matric OR phone)
  const identifier = body.matricNumber?.trim()
  if (!identifier) {
    return Response.json({ error: 'identifier is required.' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Normalise for matric lookup: uppercase. Phone numbers are stored as-is.
  const identifierUpper = identifier.toUpperCase()

  const { data, error } = await supabase
    .from('students')
    .select('id, matric_number, full_name, pin_set')
    .or(`matric_number.eq.${identifierUpper},phone_number.eq.${identifier}`)
    .maybeSingle()

  if (error) {
    return Response.json({ error: 'Database error.' }, { status: 500 })
  }

  if (!data) {
    return Response.json({ exists: false, pinSet: false })
  }

  return Response.json({
    exists:       true,
    pinSet:       data.pin_set,
    fullName:     data.full_name,
    // Return canonical matric so subsequent steps always use the real matric number
    matricNumber: data.matric_number,
  })
}
