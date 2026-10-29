import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { logAudit } from '@/lib/audit/log'
import { sendPushToUser } from '@/lib/push/send-push'

/**
 * إنشاء طلب طباعة.
 *
 * الصور تُرفع من الجهاز مباشرةً إلى التخزين قبل نداء هذا المسار، ثم
 * تصل مساراتها هنا. والسبب سرعة الإرسال: الرفع يجري موازياً، ولا ينتظر
 * المستخدم دورةً كاملة عبر الخادم لكل صفحة.
 *
 * وكل ما عدا الصور اختياري — النوع والموعد والملاحظة — فلا شيء يوقف
 * الإرسال، ويُستكمل الناقص بعده.
 */
export async function POST(request: Request) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 })

  const { data: appUser } = await supabase
    .from('users')
    .select('id, role, full_name')
    .eq('auth_id', user.id)
    .single()

  if (!appUser || (appUser.role !== 'manager' && appUser.role !== 'lawyer')) {
    return NextResponse.json({ error: 'هذا الإجراء متاح للمدير والمحامين' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const caseId = (body?.caseId as string | undefined) || ''
  const pages: string[] = Array.isArray(body?.pages) ? body.pages.filter((p: any) => typeof p === 'string') : []
  const docType = (body?.docType as string | undefined)?.trim() || null
  const note = (body?.note as string | undefined)?.trim() || null
  const dueDate = (body?.dueDate as string | undefined) || null

  if (!caseId) return NextResponse.json({ error: 'القضية غير محدّدة' }, { status: 400 })
  if (pages.length === 0) {
    return NextResponse.json({ error: 'أرفق صورة واحدة على الأقل' }, { status: 400 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: caseRow } = await admin
    .from('cases')
    .select('id, case_number, title, court_name, primary_lawyer_id')
    .eq('id', caseId)
    .maybeSingle()

  if (!caseRow) return NextResponse.json({ error: 'القضية غير موجودة' }, { status: 404 })

  /**
   * المحامي لا يطلب طباعةً في قضية لا يراها. والمدير يرى الجميع.
   * وهذا الفحص هو نفسه المعتمد في صفحة القضية.
   */
  if (appUser.role === 'lawyer') {
    const { data: lawyerRow } = await admin
      .from('lawyers')
      .select('id')
      .eq('user_id', appUser.id)
      .maybeSingle()

    let allowed = false
    if (lawyerRow) {
      if (caseRow.primary_lawyer_id === null || caseRow.primary_lawyer_id === lawyerRow.id) {
        allowed = true
      } else {
        const { data: grant } = await admin
          .from('case_lawyer_access')
          .select('case_id')
          .eq('case_id', caseId)
          .eq('lawyer_id', lawyerRow.id)
          .maybeSingle()
        allowed = Boolean(grant)
      }
    }

    if (!allowed) {
      return NextResponse.json({ error: 'لا تملك صلاحية على هذه القضية' }, { status: 403 })
    }
  }

  // المكتب فيه طبّاع واحد؛ وإن لم يوجد بعد، يبقى الطلب بلا إسناد ولا يضيع
  const { data: typist } = await admin
    .from('users')
    .select('id')
    .eq('role', 'typist')
    .limit(1)
    .maybeSingle()

  const { data: created, error: reqError } = await admin
    .from('print_requests')
    .insert({
      case_id: caseId,
      requested_by: appUser.id,
      assigned_to: typist?.id || null,
      doc_type: docType,
      note,
      due_date: dueDate,
      status: 'new',
    })
    .select('id')
    .single()

  if (reqError || !created) {
    return NextResponse.json({ error: reqError?.message || 'تعذّر إنشاء الطلب' }, { status: 500 })
  }

  const pageRows = pages.map((p, i) => ({
    request_id: created.id,
    page_order: i + 1,
    storage_path: p,
    storage_provider: 'supabase',
  }))

  const { error: pagesError } = await admin.from('print_request_pages').insert(pageRows)

  if (pagesError) {
    /**
     * طلبٌ بلا صفحات لا ينفع الطبّاع ويشوّش لوحته، فنحذفه ونُبلّغ.
     * والصور المرفوعة تبقى في التخزين ولا ضرر منها.
     */
    await admin.from('print_requests').delete().eq('id', created.id)
    return NextResponse.json({ error: 'تعذّر حفظ الصفحات: ' + pagesError.message }, { status: 500 })
  }

  const caseLabel = (caseRow.case_number || '') + ' — ' + (caseRow.title || '')

  await logAudit(
    admin,
    appUser.id,
    'print_request_created',
    'أنشأ طلب طباعة (' + (docType || 'مذكّرة') + ') في القضية ' + caseLabel +
      ' — ' + pages.length + ' صفحة',
    { case_id: caseId, request_id: created.id }
  )

  // إشعار الطبّاع — لا يُفشل الطلب إن تعثّر
  if (typist?.id) {
    try {
      const title = 'طلب طباعة جديد — ' + (docType || 'مذكّرة')
      const text = caseRow.title + '\nقضية رقم ' + caseRow.case_number +
        (caseRow.court_name ? ' في محكمة ' + caseRow.court_name : '') +
        '\n' + pages.length + ' صفحة'

      const { data: notifRow } = await admin
        .from('notifications')
        .insert({
          recipient_user_id: typist.id,
          case_id: caseId,
          type: 'print_request',
          title,
          body: text,
        })
        .select('id')
        .single()

      await sendPushToUser(admin, typist.id, title, text, '/typist/dashboard', notifRow?.id || '')
    } catch {
      // تجاهل: الطلب أُنشئ، والطبّاع يراه في لوحته على كل حال
    }
  }

  return NextResponse.json({ success: true, id: created.id, assigned: Boolean(typist?.id) })
}
