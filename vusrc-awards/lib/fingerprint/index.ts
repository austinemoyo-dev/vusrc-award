/**
 * Generates a stable SHA-256 device fingerprint from browser signals.
 * Must only be called from client-side code (browser APIs required).
 */
export async function generateFingerprint(): Promise<string> {
  const components: string[] = []

  // Screen
  components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`)

  // Navigator
  components.push(navigator.userAgent)
  components.push(navigator.language)
  components.push(String(navigator.hardwareConcurrency ?? 0))
  components.push(navigator.platform ?? '')

  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone)

  // Canvas fingerprint
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 220
    canvas.height = 60
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#f60'
      ctx.fillRect(120, 1, 68, 24)
      ctx.fillStyle = '#069'
      ctx.font = '11pt "Times New Roman"'
      ctx.fillText('VUSRC Awards 2025', 2, 18)
      ctx.fillStyle = 'rgba(102, 204, 0, 0.75)'
      ctx.font = '16pt Arial'
      ctx.fillText('Vision Uni', 4, 50)
      components.push(canvas.toDataURL())
    }
  } catch {
    components.push('no-canvas')
  }

  const raw = components.join('|||')
  const encoded = new TextEncoder().encode(raw)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
