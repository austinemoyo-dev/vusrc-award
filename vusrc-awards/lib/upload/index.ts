import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

function getExt(file: File) {
  return file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
}

function validate(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('File must be an image')
  if (file.size > MAX_SIZE) throw new Error('File must be under 5 MB')
}

async function uploadToStorage(
  bucket: string,
  path: string,
  file: File
): Promise<string> {
  const supabase = createServiceClient()
  const data = new Uint8Array(await file.arrayBuffer())
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, data, { contentType: file.type, upsert: true })
  if (error) throw new Error(error.message)
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

export async function uploadNomineePhoto(
  file: File,
  nomineeId: string
): Promise<string> {
  validate(file)
  const path = `${nomineeId}-${Date.now()}.${getExt(file)}`
  return uploadToStorage('nominee-photos', path, file)
}

export async function uploadCategoryBanner(
  file: File,
  categoryId: string
): Promise<string> {
  validate(file)
  const path = `${categoryId}-${Date.now()}.${getExt(file)}`
  return uploadToStorage('category-banners', path, file)
}
