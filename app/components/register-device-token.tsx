'use client'

import { useEffect } from 'react'

/**
 * يعمل داخل التطبيق فقط (Capacitor). في المتصفح العادي لا يفعل شيئاً
 * إطلاقاً، فتبقى إشعارات الويب كما هي بلا أي تغيّر.
 *
 * عند فتح التطبيق: يطلب إذن الإشعارات، ثم يسجّل الجهاز لدى FCM، ثم يرسل
 * الرمز إلى الخادم. وعند الضغط على إشعار يفتح الصفحة المقصودة.
 */

let alreadyWired = false

function nativePush(): any {
  const cap: any = (window as any).Capacitor
  if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return null
  if (!cap.Plugins || !cap.Plugins.PushNotifications) return null
  return cap.Plugins.PushNotifications
}

export default function RegisterDeviceToken() {
  useEffect(() => {
    if (alreadyWired) return

    const push = nativePush()
    if (!push) return

    alreadyWired = true

    push.addListener('registration', async (token: any) => {
      const value = token && token.value
      if (!value) return
      try {
        await fetch('/api/push/device-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ token: value, platform: 'android' }),
        })
      } catch {
        // لا نزعج المستخدم: تُعاد المحاولة تلقائياً عند فتح التطبيق مرة أخرى
      }
    })

    push.addListener('registrationError', (err: any) => {
      console.log('[push] registrationError | ' + JSON.stringify(err || {}))
    })

    // الضغط على الإشعار من شريط إشعارات الهاتف
    push.addListener('pushNotificationActionPerformed', (action: any) => {
      const data = (action && action.notification && action.notification.data) || {}
      const url = typeof data.url === 'string' ? data.url : ''
      // مسارات داخلية فقط، منعاً لفتح أي عنوان خارجي من حمولة إشعار
      if (url && url.charAt(0) === '/' && url.charAt(1) !== '/') {
        window.location.href = url
      }
    })

    async function start() {
      try {
        let status = await push.checkPermissions()
        if (status.receive === 'prompt' || status.receive === 'prompt-with-rationale') {
          status = await push.requestPermissions()
        }
        if (status.receive !== 'granted') return
        await push.register()
      } catch (err: any) {
        console.log('[push] register failed | ' + (err && err.message))
      }
    }

    start()
  }, [])

  return null
}
