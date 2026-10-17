import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * تسجيل رمز جهاز FCM لصاحب الجلسة الحالية.
 *
 * يمرّ عبر صلاحية الإدارة عمداً: رمز FCM يخصّ الجهاز لا المستخدم،
 * فإذا سجّل محامٍ خروجه ودخل زميله على الهاتف نفسه وجب أن تنتقل ملكية
 * الرمز إلى الداخل الجديد، وإلا ذهبت إشعارات قضايا الأول إلى الثاني.
 * وسياسة RLS تمنع المستخدم من تعديل صفٍّ يملكه غيره، فالتحقّق هنا من
 * الجلسة، والكتابة بصلاحية الخادم.
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
  const token = typeof body?.token === 'string' ? body.token.trim() : ''
  const platform = body?.platform === 'ios' ? 'ios' : 'android'

  if (!token || token.length < 20 || token.length > 4096) {
    return NextResponse.json({ error: 'رمز جهاز غير صالح' }, { status: 400 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await admin.from('device_tokens').upsert(
    {
      user_id: appUser.id,
      token,
      platform,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'token' }
  )

  if (error) {
    console.log('[device-token] FAILED | user=' + appUser.id + ' | ' + error.message)
    return NextResponse.json({ error: 'تعذّر حفظ رمز الجهاز' }, { status: 500 })
  }

  console.log('[device-token] ok | user=' + appUser.id + ' | platform=' + platform)
  return NextResponse.json({ success: true })
}
