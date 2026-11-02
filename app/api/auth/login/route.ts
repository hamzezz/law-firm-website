import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { logAudit, auditClient } from '@/lib/audit/log'
import { checkLoginThrottle, clientIp, sleep } from '@/lib/auth/throttle'

/**
 * دخول من شاشة بوابة التطبيق (public/portal.html).
 * ينسخ منطق صفحتي الدخول القائمتين حرفياً حتى لا يختلف السلوك بينهما.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const username = (body?.username as string | undefined)?.trim().toLowerCase()
  const password = body?.password as string | undefined
  const portal = body?.portal as string | undefined

  if (!username || !password || (portal !== 'staff' && portal !== 'client')) {
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  }

  const domain = portal === 'staff' ? 'staff.lawfirm.internal' : 'clients.lawfirm.internal'
  const syntheticEmail = username + '@' + domain

  /**
   * حارس المحاولات قبل أيّ نداء لـ Supabase.
   * يُبطئ بعد الثالثة، ويمنع العنوان وحده عند الأربعين — ولا يُغلق حساباً.
   */
  const ip = clientIp(request)
  const audit = auditClient()
  const verdict = await checkLoginThrottle(audit, username, ip)

  if (!verdict.allow) {
    await logAudit(audit, null, 'login_failed',
      'محاولة دخول مرفوضة لتجاوز الحدّ: ' + username, { portal, username, ip, throttled: true })
    return NextResponse.json({ error: verdict.reason || 'تجاوزتَ عدد المحاولات المسموح' }, { status: 429 })
  }

  await sleep(verdict.delayMs)

  const supabase = await createServerClient()

  const { data, error: authError } = await supabase.auth.signInWithPassword({
    email: syntheticEmail,
    password,
  })

  if (authError || !data.user) {
    // محاولة فاشلة: لا نعرف صاحبها، فنسجّل الاسم والعنوان — وعليهما يعدّ الحارس
    await logAudit(audit, null, 'login_failed',
      'محاولة دخول فاشلة باسم المستخدم: ' + username, { portal, username, ip })
    return NextResponse.json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, { status: 401 })
  }

  if (portal === 'client') {
    await logAudit(auditClient(), null, 'login_success', 'دخول موكّل: ' + username, { portal })
    return NextResponse.json({ redirect: '/client/dashboard' })
  }

  const { data: appUser, error: appUserError } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_id', data.user.id)
    .single()

  if (appUserError || !appUser) {
    await supabase.auth.signOut()
    return NextResponse.json({ error: 'لم يتم العثور على حساب موظف مرتبط بهذا المستخدم' }, { status: 403 })
  }

  /**
   * بوابة الموظفين: المحامي والمدير والطبّاع.
   * والطبّاع أُضيف هنا وحده دون المساس بشرط المحامي والمدير، فسلوكهما
   * كما كان حرفاً بحرف.
   */
  const STAFF_PORTALS: Record<string, { label: string; redirect: string }> = {
    lawyer: { label: 'محامٍ', redirect: '/lawyer/dashboard' },
    manager: { label: 'مدير', redirect: '/manager/dashboard' },
    typist: { label: 'طبّاع', redirect: '/typist/dashboard' },
  }

  const staff = STAFF_PORTALS[appUser.role as string]
  if (staff) {
    await logAudit(auditClient(), appUser.id, 'login_success', 'دخول ' + staff.label + ': ' + username, { portal })
    return NextResponse.json({ redirect: staff.redirect })
  }

  await supabase.auth.signOut()
  return NextResponse.json(
    { error: 'هذا الحساب غير مخوَّل بالدخول إلى بوابة الموظفين' },
    { status: 403 }
  )
}
