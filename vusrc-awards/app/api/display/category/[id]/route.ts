import { NextRequest } from 'next/server'
import { getDisplayCategory } from '@/lib/display/data'

interface Props {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, { params }: Props) {
  const { id } = await params
  const data = await getDisplayCategory(id)
  if (!data) return Response.json({ error: 'Category not found' }, { status: 404 })
  return Response.json(data)
}
