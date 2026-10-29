import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/push/send-push'

export const dynamic = 'force-dynamic'

/**
 * إشعار تجريبي — للتقني وحده.
 *
 * وُضع لإنهاء التخمين حين يقول محامٍ إن الإشعارات لا تصله: يُرسَل إليه
 * إشعار واحد، ويقول سجلّ Render في سطر واحد أين توقّف — عند الخادم، أم
 * عند Google، أم وصل الجهاز ولم يُعرَض.
 *
 * لا يكتب في أي جدول، ولا ينشئ جلسة ولا قضية.
 */
export async function POST(request: Request) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }

  const { data: appUser } = await supabase
    .from('users')
    .select('id, role, username, full_name')
    .eq('auth_id', user.id)
    .single()

  if (!appUser || appUser.role !== 'manager' || appUser.username !== 'tech') {
    return NextResponse.json({ error: 'هذا الإجراء متاح للتقني فقط' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const targetUsername = typeof body?.username === 'string' ? body.username.trim() : ''

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let targetId = appUser.id
  let targetName = appUser.full_name

  if (targetUsername) {
    const { data: target } = await admin
      .from('users')
      .select('id, full_name')
      .eq('username', targetUsername)
      .maybeSingle()

    if (!target) {
      return NextResponse.json({ error: 'لا يوجد مستخدم بهذا الاسم' }, { status: 404 })
    }
    targetId = target.id
    targetName = target.full_name
  }

  // ما لدى المستخدم من قنوات، ليُقارَن بما يظهر في السجلّ بعد الإرسال
  const [{ count: devices }, { count: subs }] = await Promise.all([
    admin.from('device_tokens').select('id', { count: 'exact', head: true }).eq('user_id', targetId),
    admin.from('push_subscriptions').select('id', { count: 'exact', head: true }).eq('user_id', targetId),
  ])

  console.log('[push-test] إرسال إلى ' + targetName + ' | أجهزة=' + (devices || 0) + ' | متصفحات=' + (subs || 0))

  const testTitle = 'إشعار تجريبي'
  const testBody = 'هذه رسالة اختبار من نظام المكتب. لا إجراء مطلوب.'

  // صفّ حقيقي، ليحمل الإشعار معرّفاً يُقرّ الجهاز باستلامه — فتظهر العلامات
  const { data: notifRow } = await admin
    .from('notifications')
    .insert({
      recipient_user_id: targetId,
      type: 'test',
      title: testTitle,
      body: testBody,
    })
    .select('id')
    .single()

  await sendPushToUser(
    admin,
    targetId,
    testTitle,
    testBody,
    '/portal.html',
    notifRow?.id || ''
  )

  return NextResponse.json({
    success: true,
    target: targetName,
    devices: devices || 0,
    browsers: subs || 0,
    message:
      (devices || 0) + ' جهاز و' + (subs || 0) + ' متصفح. راجع سجلّ Render لنتيجة كل قناة.',
  })
}
