import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { uploadNomineePhoto, uploadCategoryBanner } from '@/lib/upload'

export async function POST(request: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: 'Expected multipart/form-data', code: 'bad_request' }, { status: 400 })
  }

  const file = formData.get('file')
  const type = formData.get('type') as string | null
  const id = (formData.get('id') as string | null) ?? `tmp-${Date.now()}`

  if (!(file instanceof File)) {
    return Response.json({ error: 'file field is required', code: 'bad_request' }, { status: 400 })
  }

  try {
    let url: string
    if (type === 'category-banner') {
      url = await uploadCategoryBanner(file, id)
    } else {
      url = await uploadNomineePhoto(file, id)
    }
    return Response.json({ url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Upload failed'
    return Response.json({ error: msg, code: 'upload_error' }, { status: 400 })
  }
}
