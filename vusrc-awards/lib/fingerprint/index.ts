/**
 * Generates a stable device identifier for "one device per account" binding.
 *
 * A persisted random ID (stored in localStorage) is used as the primary
 * identifier — unlike a hardware/browser fingerprint, it cannot collide
 * between two different physical devices of the same model, OS, and
 * region, which previously caused false "device already used" lockouts.
 *
 * If localStorage is unavailable, falls back to a hash of browser signals.
 */
export async function generateFingerprint(): Promise<string> {
  try {
    const STORAGE_KEY = 'vusrc_device_id'
    let id = localStorage.getItem(STORAGE_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(STORAGE_KEY, id)
    }
    return id
  } catch {
    return await fallbackFingerprint()
  }
}

async function fallbackFingerprint(): Promise<string> {
  const components: string[] = []

  components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`)
  components.push(navigator.userAgent)
  components.push(navigator.language)
  components.push(String(navigator.hardwareConcurrency ?? 0))
  components.push(navigator.platform ?? '')
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone)

  const raw = components.join('|||')
  const encoded = new TextEncoder().encode(raw)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
