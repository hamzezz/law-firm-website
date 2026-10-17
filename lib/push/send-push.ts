import webpush from 'web-push'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { fcmConfigured, sendFcmToToken } from './fcm'

let vapidConfigured = false

function ensureVapidConfigured() {
  if (vapidConfigured) return
  webpush.setVapidDetails(
    'mailto:alkathirilawfirm@gmail.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
    process.env.VAPID_PRIVATE_KEY || ''
  )
  vapidConfigured = true
}

/**
 * قناة التطبيق (FCM).
 * مستقلّة تماماً عن قناة المتصفح: فشلها لا يمنع إشعار الويب، وغيابها
 * يعني أن النظام يعمل كما كان قبل التطبيق حرفاً بحرف.
 */
async function sendToDevices(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  title: string,
  body: string,
  url: string
) {
  if (!fcmConfigured()) return

  const { data: devices } = await admin
    .from('device_tokens')
    .select('id, token')
    .eq('user_id', userId)

  if (!devices || devices.length === 0) return

  const dead: string[] = []

  for (const device of devices) {
    const result = await sendFcmToToken(device.token, title, body, url)

    if (result.ok) {
      console.log('[fcm] sent ok | user=' + userId + ' | device=' + device.id)
      continue
    }

    console.log(
      '[fcm] FAILED | user=' + userId + ' | device=' + device.id + ' | ' + result.detail
    )
    if (result.dead) dead.push(device.id)
  }

  if (dead.length > 0) {
    await admin.from('device_tokens').delete().in('id', dead)
    console.log('[fcm] removed ' + dead.length + ' dead token(s)')
  }
}

export async function sendPushToUser(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  title: string,
  body: string,
  url?: string
) {
  const target = url || '/portal.html'

  // قناة التطبيق أولاً، ولا يُوقف خطؤها ما بعدها
  try {
    await sendToDevices(admin, userId, title, body, target)
  } catch (err: any) {
    console.log('[fcm] خطأ غير متوقَّع | user=' + userId + ' | ' + (err && err.message))
  }

  /* ───────── قناة المتصفح (Web Push) — كما كانت ───────── */

  ensureVapidConfigured()

  const { data: subscriptions } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (!subscriptions || subscriptions.length === 0) return

  const payload = JSON.stringify({ title, body, url: target })

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      )
      console.log('[push] sent ok | user=' + userId + ' | sub=' + sub.id)
    } catch (err: any) {
      const code = err?.statusCode ?? 'none'
      const body = (err?.body || err?.message || '').toString().slice(0, 200)
      console.log('[push] FAILED | user=' + userId + ' | sub=' + sub.id + ' | status=' + code + ' | ' + body)

      // اشتراك منتهٍ أو محذوف من جهة المتصفح: نزيله لتفادي محاولات فاشلة لاحقاً
      if (err.statusCode === 410 || err.statusCode === 404) {
        await admin.from('push_subscriptions').delete().eq('id', sub.id)
        console.log('[push] removed expired subscription ' + sub.id)
      }
    }
  }
}
