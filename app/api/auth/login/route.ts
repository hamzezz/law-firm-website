import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { logAudit, auditClient } from '@/lib/audit/log'

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

  const supabase = await createServerClient()

  const { data, error: authError } = await supabase.auth.signInWithPassword({
    email: syntheticEmail,
    password,
  })

  if (authError || !data.user) {
    // محاولة فاشلة: لا نعرف صاحبها، فنسجّل الاسم المستعمل وحده
    await logAudit(auditClient(), null, 'login_failed',
      'محاولة دخول فاشلة باسم المستخدم: ' + username, { portal })
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

  if (appUser.role === 'lawyer' || appUser.role === 'manager') {
    const roleLabel = appUser.role === 'lawyer' ? 'محامٍ' : 'مدير'
    await logAudit(auditClient(), appUser.id, 'login_success', 'دخول ' + roleLabel + ': ' + username, { portal })
    return NextResponse.json({
      redirect: appUser.role === 'lawyer' ? '/lawyer/dashboard' : '/manager/dashboard',
    })
  }

  await supabase.auth.signOut()
  return NextResponse.json(
    { error: 'هذا الحساب غير مخوَّل بالدخول إلى بوابة الموظفين' },
    { status: 403 }
  )
}
