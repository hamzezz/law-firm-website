'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default function EnableNotifications({ userId }: { userId: string }) {
  const [status, setStatus] = useState<'idle' | 'unsupported' | 'subscribed' | 'denied'>('idle')

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }

    navigator.serviceWorker.register('/sw.js').then(async (registration) => {
      const existingSubscription = await registration.pushManager.getSubscription()
      if (existingSubscription) {
        setStatus('subscribed')
      }
    })
  }, [])

  async function handleEnable() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setStatus('denied')
      return
    }

    const registration = await navigator.serviceWorker.ready
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })

    const subJson = subscription.toJSON()

    const supabase = createClient()
    await supabase.from('push_subscriptions').insert({
      user_id: userId,
      endpoint: subJson.endpoint,
      p256dh: subJson.keys ? subJson.keys.p256dh : '',
      auth: subJson.keys ? subJson.keys.auth : '',
    })

    setStatus('subscribed')
  }

  if (status === 'subscribed') return null

  /**
   * كان المكوّن يختفي حين لا يدعم المتصفّح الإشعارات، فيبقى المستخدم
   * لا يرى زرّاً ولا سبباً — وظنّ أن الإشعارات معطّلة في النظام.
   *
   * وصمتٌ كهذا أسوأ من رسالة: الإشعارات تُكتب له في النظام ولا تصل
   * هاتفه، ولا شيء يدلّه على الطريق.
   */
  if (status === 'unsupported') {
    return (
      <p className="text-[11px] text-slate-500 leading-relaxed">
        هذا المتصفّح لا يسلّم الإشعارات الفورية. افتح النظام من تطبيق المكتب،
        أو — على الآيفون — من Safari: «مشاركة» ثم «إضافة إلى الشاشة الرئيسية»،
        وافتحه من الأيقونة، ثم فعّل الإشعارات من هنا.
      </p>
    )
  }

  if (status === 'denied') {
    return (
      <p className="text-[11px] text-amber-700 leading-relaxed">
        الإشعارات ممنوعة لهذا الموقع في إعدادات متصفّحك. اسمح بها من إعدادات
        الموقع، ثم أعد فتح الصفحة.
      </p>
    )
  }

  return (
    <button
      onClick={handleEnable}
      className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition font-bold"
    >
      🔔 تفعيل الإشعارات الفورية
    </button>
  )
}
