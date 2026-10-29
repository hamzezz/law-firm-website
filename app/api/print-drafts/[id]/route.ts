import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { logAudit, auditClient } from '@/lib/audit/log'

export const dynamic = 'force-dynamic'

/**
 * بوابة فتح ملفات المسودّات — على نمط بوابة المستندات نفسها:
 * الصلاحية تُفحص هنا، وكل فتح يُسجَّل، والرابط يعيش دقيقة واحدة.
 *
 * الصيغة تُطلب بـ ?f=word أو ?f=pdf.
 */

const LINK_TTL_SECONDS = 60

function deny(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const kind = new URL(request.url).searchParams.get('f') === 'word' ? 'word' : 'pdf'

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

  const { data: draft } = await admin
    .from('print_drafts')
    .select('id, draft_no, word_path, pdf_path, request_id')
    .eq('id', id)
    .maybeSingle()

  if (!draft) return deny('المسودّة غير موجودة', 404)

  const { data: req } = await admin
    .from('print_requests')
    .select('id, case_id, assigned_to, requested_by')
    .eq('id', draft.request_id)
    .maybeSingle()

  if (!req) return deny('المسودّة غير موجودة', 404)

  const { data: caseRow } = await admin
    .from('cases')
    .select('id, case_number, title, primary_lawyer_id')
    .eq('id', req.case_id)
    .maybeSingle()

  const caseLabel = caseRow ? (caseRow.case_number || '') + ' — ' + (caseRow.title || '') : ''

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
      'حاول فتح مسودّة طباعة لا يملك صلاحيتها — قضية ' + caseLabel,
      { draftId: draft.id, requestId: req.id, caseId: req.case_id }
    )
    return deny('لا تملك صلاحية الاطّلاع على هذه المسودّة', 403)
  }

  const path = kind === 'word' ? draft.word_path : draft.pdf_path
  if (!path) return deny('لا توجد هذه الصيغة في المسودّة', 404)

  const signed = await admin.storage
    .from('case-documents')
    .createSignedUrl(path, LINK_TTL_SECONDS)

  const url = signed.data ? signed.data.signedUrl : null
  if (!url) {
    console.log('[print-drafts] تعذّر توقيع الرابط | draft=' + draft.id)
    return deny('تعذّر فتح الملف', 500)
  }

  await logAudit(
    admin,
    appUser.id,
    'document_opened',
    'فتح المسودّة رقم ' + draft.draft_no + ' (' + (kind === 'word' ? 'Word' : 'PDF') + ') — قضية ' + caseLabel,
    { draftId: draft.id, requestId: req.id, caseId: req.case_id }
  )

  const res = NextResponse.redirect(url, 302)
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  res.headers.set('Referrer-Policy', 'no-referrer')
  return res
}
