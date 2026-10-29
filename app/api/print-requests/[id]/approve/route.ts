import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { logAudit, auditClient } from '@/lib/audit/log'
import { sendPushToUser } from '@/lib/push/send-push'

export const dynamic = 'force-dynamic'

/**
 * اعتماد مسودّة.
 *
 * الاعتماد يفعل ثلاثة أشياء معاً:
 *   ١) يختم المسودّة نسخةً معتمدة، ويقفل الطلب فلا تُرفع له مسودّة بعدها.
 *   ٢) يُدخل ملفّيها في مستندات القضية، فتُوجد حيث يبحث عنها الناس
 *      بعد شهور — لا في طلب طباعة ينساه أحد.
 *   ٣) يُقيَّد في سجلّ التدقيق باسم معتمِدها.
 *
 * والملف لا يُنسخ في المخزن: صفّ المستند يشير إلى المسار نفسه. ونسخةٌ
 * واحدة في موضعين خيرٌ من نسختين قد تختلفان.
 */
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
    .select('id, role')
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

  const canApprove = appUser.role === 'manager' || req.requested_by === appUser.id
  if (!canApprove) {
    return NextResponse.json({ error: 'الاعتماد لصاحب الطلب أو المدير' }, { status: 403 })
  }

  if (req.status === 'approved') {
    return NextResponse.json({ error: 'الطلب معتمد بالفعل' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const draftId = String(body?.draftId || '')
  if (!draftId) return NextResponse.json({ error: 'المسودّة غير محدّدة' }, { status: 400 })

  const { data: draft } = await admin
    .from('print_drafts')
    .select('id, draft_no, word_path, pdf_path, request_id')
    .eq('id', draftId)
    .eq('request_id', id)
    .maybeSingle()

  if (!draft) return NextResponse.json({ error: 'المسودّة غير موجودة' }, { status: 404 })

  const { data: caseRow } = await admin
    .from('cases')
    .select('id, case_number, title')
    .eq('id', req.case_id)
    .maybeSingle()

  const label = (req.doc_type || 'مذكّرة') + ' — ' + (caseRow?.case_number || '')

  /* ═══ إدخالها في مستندات القضية ═══ */

  const docRows: any[] = []
  if (draft.word_path) {
    docRows.push({
      case_id: req.case_id,
      session_id: null,
      file_name: label + '.docx',
      storage_path: draft.word_path,
      storage_provider: 'supabase',
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      uploaded_by: appUser.id,
    })
  }
  if (draft.pdf_path) {
    docRows.push({
      case_id: req.case_id,
      session_id: null,
      file_name: label + '.pdf',
      storage_path: draft.pdf_path,
      storage_provider: 'supabase',
      mime_type: 'application/pdf',
      uploaded_by: appUser.id,
    })
  }

  if (docRows.length > 0) {
    const { error: docError } = await admin.from('documents').insert(docRows)
    if (docError) {
      return NextResponse.json(
        { error: 'تعذّر حفظها في مستندات القضية: ' + docError.message },
        { status: 500 }
      )
    }
  }

  const { error: upError } = await admin
    .from('print_requests')
    .update({
      status: 'approved',
      approved_draft_id: draft.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (upError) {
    return NextResponse.json({ error: upError.message }, { status: 500 })
  }

  await logAudit(
    admin,
    appUser.id,
    'print_request_approved',
    'اعتمد المسودّة رقم ' + draft.draft_no + ' — ' + label + '، وحُفظت في مستندات القضية',
    { request_id: id, draft_id: draft.id, case_id: req.case_id }
  )

  if (req.assigned_to) {
    try {
      const title = 'اعتُمدت المسودّة'
      const text = 'المسودّة رقم ' + draft.draft_no + ' — ' + label
      const { data: notifRow } = await admin
        .from('notifications')
        .insert({
          recipient_user_id: req.assigned_to,
          case_id: req.case_id,
          type: 'print_approved',
          title,
          body: text,
        })
        .select('id')
        .single()

      await sendPushToUser(admin, req.assigned_to, title, text, '/typist/dashboard', notifRow?.id || '')
    } catch {
      // الاعتماد تمّ، والتنبيه تحسينٌ لا شرط
    }
  }

  return NextResponse.json({ success: true })
}
