import { NextRequest } from 'next/server'
import { getStudentSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const session = await getStudentSession()
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { nomineeId?: unknown; categoryId?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { nomineeId, categoryId } = body
  if (typeof nomineeId !== 'string' || !nomineeId) {
    return Response.json({ error: 'nomineeId is required' }, { status: 400 })
  }
  if (typeof categoryId !== 'string' || !categoryId) {
    return Response.json({ error: 'categoryId is required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Verify category: must exist, be open, and not past closes_at
  const { data: category } = await supabase
    .from('categories')
    .select('id, is_open, closes_at')
    .eq('id', categoryId)
    .maybeSingle()

  if (!category) {
    return Response.json({ error: 'Category not found' }, { status: 404 })
  }
  if (!category.is_open) {
    return Response.json({ error: 'Voting is not open for this category' }, { status: 403 })
  }
  if (category.closes_at && new Date(category.closes_at as string) <= new Date()) {
    return Response.json({ error: 'Voting has closed for this category' }, { status: 403 })
  }

  // Verify nominee belongs to the given category
  const { data: nominee } = await supabase
    .from('nominees')
    .select('id')
    .eq('id', nomineeId)
    .eq('category_id', categoryId)
    .maybeSingle()

  if (!nominee) {
    return Response.json({ error: 'Nominee not found in this category' }, { status: 404 })
  }

  // Insert vote — unique constraint on (student_id, category_id) prevents duplicates
  const { error: insertErr } = await supabase.from('votes').insert({
    student_id: session.studentId,
    nominee_id: nomineeId,
    category_id: categoryId,
  })

  if (insertErr) {
    // PostgreSQL unique violation: 23505
    if ((insertErr as { code?: string }).code === '23505') {
      return Response.json({ error: 'already_voted' }, { status: 409 })
    }
    return Response.json({ error: 'Vote failed. Please try again.' }, { status: 500 })
  }

  return Response.json({ success: true })
}
