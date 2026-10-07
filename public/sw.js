self.addEventListener('push', function (event) {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch (e) {
    payload = { title: 'إشعار جديد', body: event.data.text() }
  }

  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    dir: 'rtl',
    lang: 'ar',
    data: { url: payload.url || '/staff/login' },
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'مكتب وليد الكثيري', options)
  )
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : '/staff/login'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})

// ── تمكين تثبيت الموقع كتطبيق ──
// المتصفح لا يعرض خيار "تثبيت التطبيق" إلا إذا كان لعامل الخدمة معالج fetch
// يستطيع الردّ عند انقطاع الشبكة. لا علاقة لهذا بالإشعارات أعلاه.

const SHELL = 'kathiri-shell-v1'

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(SHELL).then(function (cache) {
      return cache.addAll(['/offline.html'])
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== SHELL }).map(function (k) { return caches.delete(k) })
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', function (event) {
  if (event.request.mode !== 'navigate') return
  event.respondWith(
    fetch(event.request).catch(function () {
      return caches.match('/offline.html')
    })
  )
})
