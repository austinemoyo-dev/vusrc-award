// VUSRC Awards Service Worker — handles push notifications

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data?.json() ?? {}
  } catch {
    data = { title: 'VUSRC Awards', body: event.data?.text() ?? '' }
  }

  const title = data.title ?? 'VUSRC Awards'
  const options = {
    body:    data.body   ?? '',
    icon:    '/favicon.svg',
    badge:   '/favicon.svg',
    tag:     data.tag    ?? 'vusrc-awards',
    renotify: true,
    data:    data.url ? { url: data.url } : {},
    vibrate: [200, 100, 200],
    actions: data.url ? [{ action: 'open', title: 'Vote now' }] : [],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url
  if (!url) return

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // Focus existing tab if open, otherwise open a new one
      const existing = list.find((c) => c.url.includes(url))
      if (existing) return existing.focus()
      return clients.openWindow(url)
    })
  )
})
