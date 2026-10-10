import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

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
    return NextResponse.json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, { status: 401 })
  }

  if (portal === 'client') {
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

  if (appUser.role === 'lawyer') {
    return NextResponse.json({ redirect: '/lawyer/dashboard' })
  }

  if (appUser.role === 'manager') {
    return NextResponse.json({ redirect: '/manager/dashboard' })
  }

  await supabase.auth.signOut()
  return NextResponse.json(
    { error: 'هذا الحساب غير مخوَّل بالدخول إلى بوابة الموظفين' },
    { status: 403 }
  )
}
