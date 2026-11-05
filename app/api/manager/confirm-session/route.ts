import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createSessionAndNotify } from '@/lib/moj-parser/process-sessions'
import { logAudit } from '@/lib/audit/log'

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
    return NextResponse.json({ error: 'هذا الإجراء متاح للتقني فقط' }, { status: 403 })
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

  if (result.ok && result.isNew) {
    await logAudit(admin, appUser.id, 'session_created',
      'أنشأ جلسة بتاريخ ' + sessionDate + ' في قضية: ' + result.title)
  }

  if (!result.ok) {
    return NextResponse.json({ error: 'لم يتم العثور على القضية' }, { status: 404 })
  }

  /**
   * الجلسة والإشعار صارا مستقلّين: الجلسة قد تكون مسجّلة سلفاً
   * ويُرسَل عنها إشعارٌ اليوم، والعكس. فالرسالة تذكر الحالتين معاً
   * حتى لا يظنّ التقني أن شيئاً لم يحدث.
   */
  const message = result.isNew
    ? (result.notified > 0
        ? 'تم إنشاء الجلسة وإرسال ' + result.notified + ' إشعاراً'
        : 'تم إنشاء الجلسة — ولا مستلم للإشعار')
    : (result.notified > 0
        ? 'الجلسة مسجّلة مسبقاً — وأُرسل ' + result.notified + ' إشعاراً تذكيرياً'
        : 'الجلسة مسجّلة مسبقاً وأُشعر الفريق بها اليوم — لم يُكرَّر شيء')

  return NextResponse.json({
    success: true,
    isNew: result.isNew,
    notified: result.notified,
    title: result.title,
    message,
  })
}
