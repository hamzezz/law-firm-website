import webpush from 'web-push'
import { createClient as createAdminClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  'mailto:alkathirilawfirm@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function sendPushToUser(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  title: string,
  body: string,
  url?: string
) {
  const { data: subscriptions } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (!subscriptions || subscriptions.length === 0) return

  const payload = JSON.stringify({ title, body, url: url || '/staff/login' })

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      )
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await admin.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }
}
