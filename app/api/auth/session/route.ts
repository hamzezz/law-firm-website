import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * هل هناك جلسة قائمة؟ وإلى أي لوحة ينتمي صاحبها؟
 * تستعملها بوابة التطبيق (public/portal.html) لتتخطّى شاشة الدخول
 * لمن سبق أن سجّل دخوله. لا تُعيد أي بيانات عن المستخدم، فقط الوجهة.
 */
export async function GET() {
  const noStore = { headers: { 'Cache-Control': 'no-store' } }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({}, noStore)
  }

  const { data: appUser } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', user.id)
    .single()

  if (!appUser) {
    return NextResponse.json({}, noStore)
  }

  if (appUser.role === 'client') {
    return NextResponse.json({ redirect: '/client/dashboard' }, noStore)
  }

  if (appUser.role === 'lawyer') {
    return NextResponse.json({ redirect: '/lawyer/dashboard' }, noStore)
  }

  if (appUser.role === 'manager') {
    return NextResponse.json({ redirect: '/manager/dashboard' }, noStore)
  }

  return NextResponse.json({}, noStore)
}
