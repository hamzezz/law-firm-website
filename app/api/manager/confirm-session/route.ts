import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createSessionAndNotify } from '@/lib/moj-parser/process-sessions'

export async function POST(request: Request) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }

  const { data: appUser } = await supabase
    .from('users')
    .select('id, role, username')
    .eq('auth_id', user.id)
    .single()

  if (!appUser || appUser.role !== 'manager' || appUser.username !== 'tech') {
    return NextResponse.json({ error: 'هذا الإجراء متاح للمدير التقني فقط' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const caseId = body?.caseId as string | undefined
  const sessionDate = body?.sessionDate as string | undefined

  if (!caseId || !sessionDate) {
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
    return NextResponse.json({ error: 'تاريخ غير صالح' }, { status: 400 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const result = await createSessionAndNotify(admin, caseId, sessionDate)

  if (!result.ok) {
    return NextResponse.json({ error: 'لم يتم العثور على القضية' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    isNew: result.isNew,
    title: result.title,
    message: result.isNew
      ? 'تم إنشاء الجلسة وإرسال الإشعارات'
      : 'الجلسة مسجّلة مسبقاً في هذا التاريخ — لم تُرسل إشعارات مكررة',
  })
}
