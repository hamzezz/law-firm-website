import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { logAudit, auditClient } from '@/lib/audit/log'

export const dynamic = 'force-dynamic'

/**
 * بوابة فتح صفحات طلب الطباعة.
 *
 * على نمط بوابة المستندات نفسها: الهوية من الجلسة، والصلاحية تُفحص هنا،
 * وكل فتح يُسجَّل، والرابط يعيش دقيقة واحدة.
 *
 * والتوقيع يجري بصلاحية الخادم لا بصلاحية المستخدم: الطبّاع لا يملك
 * وصولاً إلى مخزن القضايا، والحكم في هذا الملف لا في سياسات التخزين.
 */

const LINK_TTL_SECONDS = 60

function deny(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return deny('غير مصرح', 401)

  const { data: appUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_id', user.id)
    .single()

  if (!appUser) return deny('غير مصرح', 401)

  const admin = auditClient()

  const { data: page } = await admin
    .from('print_request_pages')
    .select('id, page_order, storage_path, request_id')
    .eq('id', id)
    .maybeSingle()

  if (!page) return deny('الصفحة غير موجودة', 404)

  const { data: req } = await admin
    .from('print_requests')
    .select('id, case_id, assigned_to, requested_by')
    .eq('id', page.request_id)
    .maybeSingle()

  if (!req) return deny('الصفحة غير موجودة', 404)

  const { data: caseRow } = await admin
    .from('cases')
    .select('id, case_number, title, primary_lawyer_id')
    .eq('id', req.case_id)
    .maybeSingle()

  const caseLabel = caseRow ? (caseRow.case_number || '') + ' — ' + (caseRow.title || '') : ''

  /* ═══ الصلاحية ═══ */

  let allowed = false

  if (appUser.role === 'manager') {
    allowed = true
  } else if (appUser.role === 'typist') {
    allowed = req.assigned_to === appUser.id || req.assigned_to === null
  } else if (appUser.role === 'lawyer' && caseRow) {
    const { data: lawyerRow } = await admin
      .from('lawyers')
      .select('id')
      .eq('user_id', appUser.id)
      .maybeSingle()

    if (lawyerRow) {
      if (caseRow.primary_lawyer_id === lawyerRow.id || caseRow.primary_lawyer_id === null) {
        allowed = true
      } else {
        const { data: access } = await admin
          .from('case_lawyer_access')
          .select('case_id')
          .eq('case_id', caseRow.id)
          .eq('lawyer_id', lawyerRow.id)
          .maybeSingle()
        allowed = Boolean(access)
      }
    }
  }

  if (!allowed) {
    await logAudit(
      admin,
      appUser.id,
      'document_access_denied',
      'حاول فتح صفحة طلب طباعة لا يملك صلاحيتها — قضية ' + caseLabel,
      { pageId: page.id, requestId: req.id, caseId: req.case_id }
    )
    return deny('لا تملك صلاحية الاطّلاع على هذه الصفحة', 403)
  }

  const signed = await admin.storage
    .from('case-documents')
    .createSignedUrl(page.storage_path, LINK_TTL_SECONDS)

  const url = signed.data ? signed.data.signedUrl : null

  if (!url) {
    console.log('[print-pages] تعذّر توقيع الرابط | page=' + page.id)
    return deny('تعذّر فتح الصفحة', 500)
  }

  await logAudit(
    admin,
    appUser.id,
    'document_opened',
    'فتح صفحة طلب طباعة رقم ' + page.page_order + ' — قضية ' + caseLabel,
    { pageId: page.id, requestId: req.id, caseId: req.case_id }
  )

  const res = NextResponse.redirect(url, 302)
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  res.headers.set('Referrer-Policy', 'no-referrer')
  return res
}
