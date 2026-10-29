import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { logAudit, auditClient } from '@/lib/audit/log'
import { sendPushToUser } from '@/lib/push/send-push'

export const dynamic = 'force-dynamic'

/**
 * ملاحظة على مسودّة.
 *
 * تُكتب في الطلب نفسه لا في رسالة، فتبقى مع المسودّة التي تخصّها،
 * ويعلّم عليها الطبّاع حين يعالجها.
 *
 * وكتابة ملاحظة تُعيد الطلب إلى «قيد الطباعة»، فحال العمل تتبدّل من
 * الفعل نفسه ولا تحتاج زرّاً يُضغط ويُنسى.
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
    .select('id, case_id, assigned_to, requested_by, status')
    .eq('id', id)
    .maybeSingle()

  if (!req) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })

  const body = await request.json().catch(() => null)
  const action = String(body?.action || 'add')

  /* ═══ الطبّاع يعلّم الملاحظة بأنها عولجت ═══ */
  if (action === 'resolve') {
    const noteId = String(body?.noteId || '')
    if (!noteId) return NextResponse.json({ error: 'الملاحظة غير محدّدة' }, { status: 400 })

    const allowed =
      appUser.role === 'manager' ||
      (appUser.role === 'typist' && (req.assigned_to === appUser.id || req.assigned_to === null))

    if (!allowed) return NextResponse.json({ error: 'غير مصرّح' }, { status: 403 })

    const { error } = await admin
      .from('print_notes')
      .update({ is_resolved: true })
      .eq('id', noteId)
      .eq('request_id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  /* ═══ كتابة ملاحظة ═══ */

  // الملاحظة من صاحب الطلب أو من المدير — لا من الطبّاع
  const canNote = appUser.role === 'manager' || req.requested_by === appUser.id
  if (!canNote) return NextResponse.json({ error: 'غير مصرّح' }, { status: 403 })

  if (req.status === 'approved') {
    return NextResponse.json({ error: 'الطلب معتمد ومقفل' }, { status: 400 })
  }

  const text = (body?.body as string | undefined)?.trim()
  const draftId = (body?.draftId as string | undefined) || null

  if (!text) return NextResponse.json({ error: 'اكتب الملاحظة' }, { status: 400 })

  const { data: note, error: noteError } = await admin
    .from('print_notes')
    .insert({
      request_id: id,
      draft_id: draftId,
      body: text,
      created_by: appUser.id,
    })
    .select('id')
    .single()

  if (noteError || !note) {
    return NextResponse.json({ error: noteError?.message || 'تعذّر حفظ الملاحظة' }, { status: 500 })
  }

  await admin
    .from('print_requests')
    .update({ status: 'typing', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (req.assigned_to) {
    try {
      const title = 'ملاحظة على المسودّة'
      const preview = text.length > 90 ? text.slice(0, 90) + '…' : text
      const { data: notifRow } = await admin
        .from('notifications')
        .insert({
          recipient_user_id: req.assigned_to,
          case_id: req.case_id,
          type: 'print_note',
          title,
          body: preview,
        })
        .select('id')
        .single()

      await sendPushToUser(admin, req.assigned_to, title, preview, '/typist/dashboard', notifRow?.id || '')
    } catch {
      // الملاحظة محفوظة ويراها الطبّاع في لوحته
    }
  }

  return NextResponse.json({ success: true, id: note.id })
}
