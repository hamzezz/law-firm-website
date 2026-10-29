import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { logAudit, auditClient } from '@/lib/audit/log'
import { sendPushToUser } from '@/lib/push/send-push'

export const dynamic = 'force-dynamic'

/**
 * رفع مسودّة من الطبّاع.
 *
 * الملفات تمرّ عبر الخادم لا من المتصفّح مباشرة: الطبّاع لا يملك وصولاً
 * إلى مخزن القضايا، والرفع بصلاحية الخادم يُغنينا عن فتح المخزن له.
 *
 * ورقم المسودّة يُحسب هنا من أعلى رقم موجود، فلا يتضارب رقمان إن رُفعت
 * مسودّتان في وقتٍ متقارب.
 */

const MAX_BYTES = 15 * 1024 * 1024

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 })

  const { data: appUser } = await supabase
    .from('users')
    .select('id, role, full_name')
    .eq('auth_id', user.id)
    .single()

  if (!appUser) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 })

  const admin = auditClient()

  const { data: req } = await admin
    .from('print_requests')
    .select('id, case_id, assigned_to, requested_by, status, doc_type')
    .eq('id', id)
    .maybeSingle()

  if (!req) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })

  const isTypist = appUser.role === 'typist' && (req.assigned_to === appUser.id || req.assigned_to === null)
  if (!isTypist && appUser.role !== 'manager') {
    return NextResponse.json({ error: 'رفع المسودّات للطبّاع' }, { status: 403 })
  }

  if (req.status === 'approved') {
    return NextResponse.json({ error: 'الطلب معتمد ومقفل، ولا تُرفع له مسودّات' }, { status: 400 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 })
  }

  const wordFile = form.get('word') as File | null
  const pdfFile = form.get('pdf') as File | null

  if (!wordFile && !pdfFile) {
    return NextResponse.json({ error: 'أرفق ملف Word أو PDF على الأقل' }, { status: 400 })
  }

  for (const f of [wordFile, pdfFile]) {
    if (f && f.size > MAX_BYTES) {
      return NextResponse.json({ error: 'حجم الملف يتجاوز ١٥ ميجابايت' }, { status: 400 })
    }
  }

  // رقم المسودّة التالي
  const { data: top } = await admin
    .from('print_drafts')
    .select('draft_no')
    .eq('request_id', id)
    .order('draft_no', { ascending: false })
    .limit(1)
    .maybeSingle()

  const draftNo = ((top && top.draft_no) || 0) + 1
  const base = req.case_id + '/print/' + id + '/draft-' + draftNo

  /**
   * يُعيد المسار، أو رسالة الخطأ كما وردت من التخزين.
   *
   * كانت الدالة تبتلع الرسالة وتعيد «تعذّر الرفع» وحدها، فضاع السبب —
   * وقيد نوع الملف على المستودع يبدو حينها كعطلٍ مجهول.
   */
  async function put(file: File, ext: string): Promise<{ path?: string; error?: string }> {
    const path = base + '.' + ext
    const buf = Buffer.from(await file.arrayBuffer())
    const { error } = await admin.storage
      .from('case-documents')
      .upload(path, buf, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      })
    if (error) {
      console.log('[print-draft] تعذّر الرفع | ' + path + ' | ' + file.type + ' | ' + error.message)
      return { error: error.message }
    }
    return { path }
  }

  let wordPath: string | null = null
  let pdfPath: string | null = null

  if (wordFile) {
    const r = await put(wordFile, 'docx')
    if (!r.path) {
      return NextResponse.json({ error: 'تعذّر رفع ملف Word: ' + (r.error || '') }, { status: 500 })
    }
    wordPath = r.path
  }
  if (pdfFile) {
    const r = await put(pdfFile, 'pdf')
    if (!r.path) {
      return NextResponse.json({ error: 'تعذّر رفع ملف PDF: ' + (r.error || '') }, { status: 500 })
    }
    pdfPath = r.path
  }

  const { data: draft, error: draftError } = await admin
    .from('print_drafts')
    .insert({
      request_id: id,
      draft_no: draftNo,
      word_path: wordPath,
      pdf_path: pdfPath,
      storage_provider: 'supabase',
      uploaded_by: appUser.id,
    })
    .select('id, draft_no')
    .single()

  if (draftError || !draft) {
    return NextResponse.json({ error: draftError?.message || 'تعذّر حفظ المسودّة' }, { status: 500 })
  }

  await admin
    .from('print_requests')
    .update({ status: 'review', updated_at: new Date().toISOString() })
    .eq('id', id)

  await logAudit(
    admin,
    appUser.id,
    'print_draft_uploaded',
    'رفع المسودّة رقم ' + draftNo + ' في طلب طباعة',
    { request_id: id, draft_id: draft.id, case_id: req.case_id }
  )

  // تنبيه صاحب الطلب أن المسودّة جاهزة للمراجعة
  try {
    const title = 'مسودّة جاهزة للمراجعة'
    const text = 'المسودّة رقم ' + draftNo + ' من ' + (req.doc_type || 'مذكّرة')
    const { data: notifRow } = await admin
      .from('notifications')
      .insert({
        recipient_user_id: req.requested_by,
        case_id: req.case_id,
        type: 'print_draft',
        title,
        body: text,
      })
      .select('id')
      .single()

    await sendPushToUser(
      admin, req.requested_by, title, text,
      '/manager/cases/' + req.case_id, notifRow?.id || ''
    )
  } catch {
    // المسودّة محفوظة، والتنبيه تحسينٌ لا شرط
  }

  return NextResponse.json({ success: true, draftNo, id: draft.id })
}
