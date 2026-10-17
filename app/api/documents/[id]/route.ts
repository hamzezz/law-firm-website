import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { logAudit, auditClient } from '@/lib/audit/log'
import { r2SignedUrl, r2Configured } from '@/lib/r2/client'

export const dynamic = 'force-dynamic'

/**
 * بوابة فتح المستندات.
 *
 * كانت الصفحة توقّع رابطاً لكل مستند عند عرضها، فيذهب المتصفح إلى
 * المخزن مباشرة ونحن خارج المعادلة: لا نعرف من فتح ماذا، ولا نراجع
 * الصلاحية إلا لحظة بناء الصفحة.
 *
 * والآن يمرّ كل فتح من هنا:
 *   ١) هوية مؤكَّدة من الجلسة
 *   ٢) صلاحية تُفحص على القضية نفسها لا على الصفحة
 *   ٣) تسجيل في سجلّ التدقيق — النجاح والمنع معاً
 *   ٤) رابط موقّت عمره دقيقة واحدة، ثم تحويل إليه
 *
 * وما لا يحميه: بعد التحويل يملك المتصفح رابطاً صالحاً دقيقة. من نسخه
 * في تلك الدقيقة وأرسله لغيره لم نره. حمايته التزام المحامي المهني،
 * وقِصَر العمر يضيّق النافذة ولا يُلغيها.
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
    .select('id, role, full_name')
    .eq('auth_id', user.id)
    .single()

  if (!appUser) return deny('غير مصرح', 401)

  const admin = auditClient()

  // المستند وقضيته — بصلاحية الخادم، لأن الحكم يُبنى هنا لا على RLS وحدها
  const { data: doc } = await admin
    .from('documents')
    .select('id, file_name, case_id, storage_path, storage_provider')
    .eq('id', id)
    .maybeSingle()

  if (!doc) return deny('المستند غير موجود', 404)

  const { data: caseRow } = await admin
    .from('cases')
    .select('id, case_number, title, primary_lawyer_id, client_id')
    .eq('id', doc.case_id)
    .maybeSingle()

  if (!caseRow) return deny('المستند غير موجود', 404)

  const caseLabel = (caseRow.case_number || '') + ' — ' + (caseRow.title || '')

  /* ═══ الصلاحية ═══ */

  let allowed = false

  if (appUser.role === 'manager') {
    allowed = true
  } else if (appUser.role === 'lawyer') {
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
          .select('id')
          .eq('case_id', caseRow.id)
          .eq('lawyer_id', lawyerRow.id)
          .maybeSingle()
        allowed = !!access
      }
    }
  } else if (appUser.role === 'client') {
    const { data: clientRow } = await admin
      .from('clients')
      .select('id')
      .eq('user_id', appUser.id)
      .maybeSingle()
    allowed = !!clientRow && caseRow.client_id === clientRow.id
  }

  if (!allowed) {
    // المنع يُسجَّل كما يُسجَّل الفتح: محاولة الوصول إلى مستند قضية
    // لا يملكها صاحبها حدثٌ يستحقّ أن يُرى.
    await logAudit(
      admin,
      appUser.id,
      'document_access_denied',
      'حاول فتح مستند لا يملك صلاحيته: ' + (doc.file_name || '') + ' — قضية ' + caseLabel,
      { documentId: doc.id, caseId: caseRow.id }
    )
    return deny('لا تملك صلاحية الاطّلاع على هذا المستند', 403)
  }

  /* ═══ الرابط الموقّت ═══ */

  let url: string | null = null

  if (doc.storage_provider === 'r2') {
    url = r2Configured() ? await r2SignedUrl(doc.storage_path, LINK_TTL_SECONDS) : null
  } else {
    const signed = await supabase.storage
      .from('case-documents')
      .createSignedUrl(doc.storage_path, LINK_TTL_SECONDS)
    url = signed.data ? signed.data.signedUrl : null
  }

  if (!url) {
    console.log('[documents] تعذّر توقيع الرابط | doc=' + doc.id)
    return deny('تعذّر فتح المستند', 500)
  }

  await logAudit(
    admin,
    appUser.id,
    'document_opened',
    'فتح مستنداً: ' + (doc.file_name || 'بلا اسم') + ' — قضية ' + caseLabel,
    { documentId: doc.id, caseId: caseRow.id }
  )

  const res = NextResponse.redirect(url, 302)
  // لا يُخزَّن التحويل في أي ذاكرة وسيطة، ولا يُسرَّب الرابط في الإحالة
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  res.headers.set('Referrer-Policy', 'no-referrer')
  return res
}
