import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * إقرار استلام إشعار من الجهاز — الصحّان الرماديان.
 *
 * Google تخبرنا أنها قبلت الإرسال، لا أنها أوصلته. فالجهاز نفسه هو من
 * يبلّغنا لحظة استلامه، ومن هنا نعرف أين يتوقّف الإشعار حين لا يصل:
 * عند الخادم، أم عند Google، أم وصل الجهاز ولم يُعرَض.
 *
 * لا يسجّل الإقرار إلا صاحب الإشعار نفسه، ولا يُكتب الوقت مرتين.
 */
export async function POST(request: Request) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }

  const { data: appUser } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single()

  if (!appUser) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const notificationId = typeof body?.notificationId === 'string' ? body.notificationId.trim() : ''

  if (!notificationId) {
    return NextResponse.json({ error: 'معرّف ناقص' }, { status: 400 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // الشرطان معاً: الإشعار لصاحبه، ولم يُسجَّل استلامه من قبل.
  // فأول جهاز يبلّغ هو صاحب الوقت، ولا يطمسه ما بعده.
  const { error } = await admin
    .from('notifications')
    .update({ delivered_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('recipient_user_id', appUser.id)
    .is('delivered_at', null)

  if (error) {
    console.log('[receipt] FAILED | notif=' + notificationId + ' | ' + error.message)
    return NextResponse.json({ error: 'تعذّر التسجيل' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
