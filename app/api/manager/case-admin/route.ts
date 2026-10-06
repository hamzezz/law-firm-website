import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

async function requireTech() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح', status: 401 as const }

  const { data: appUser } = await supabase
    .from('users')
    .select('id, role, username')
    .eq('auth_id', user.id)
    .single()

  if (!appUser || appUser.role !== 'manager' || appUser.username !== 'tech') {
    return { error: 'هذا الإجراء متاح للمدير التقني فقط', status: 403 as const }
  }
  return { ok: true as const }
}

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function PATCH(request: Request) {
  const guard = await requireTech()
  if ('error' in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status })
  }

  const body = await request.json().catch(() => null)
  const caseId = body?.caseId as string | undefined
  const fields = body?.fields as Record<string, string> | undefined

  if (!caseId || !fields) {
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  }

  const allowed = ['title', 'case_number', 'court_name', 'case_type', 'stage', 'other_party']
  const patch: Record<string, any> = {}
  for (const k of allowed) {
    if (typeof fields[k] === 'string') patch[k] = fields[k].trim() || null
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'لا يوجد ما يُحدَّث' }, { status: 400 })
  }

  const { error } = await admin().from('cases').update(patch).eq('id', caseId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'تم حفظ التعديلات' })
}

export async function POST(request: Request) {
  const guard = await requireTech()
  if ('error' in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status })
  }

  const body = await request.json().catch(() => null)
  const caseId = body?.caseId as string | undefined
  if (!caseId) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

  const db = admin()
  const count = async (table: string) => {
    const { count: n } = await db.from(table).select('id', { count: 'exact', head: true }).eq('case_id', caseId)
    return n || 0
  }

  return NextResponse.json({
    sessions: await count('sessions'),
    notifications: await count('notifications'),
    deadlines: await count('critical_deadlines'),
  })
}

export async function DELETE(request: Request) {
  const guard = await requireTech()
  if ('error' in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status })
  }

  const body = await request.json().catch(() => null)
  const caseId = body?.caseId as string | undefined
  const typed = (body?.confirmNumber as string | undefined) || ''

  if (!caseId) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

  const db = admin()

  const { data: caseRow } = await db
    .from('cases')
    .select('id, case_number')
    .eq('id', caseId)
    .maybeSingle()

  if (!caseRow) return NextResponse.json({ error: 'القضية غير موجودة' }, { status: 404 })

  // حاجز أمان: كتابة رقم القضية يدوياً. الضغطة تقع سهواً، والكتابة لا تقع.
  if (typed.trim() !== (caseRow.case_number || '').trim()) {
    return NextResponse.json({ error: 'رقم القضية المكتوب لا يطابق' }, { status: 400 })
  }

  // الحذف نهائي ولا رجعة فيه. نحذف التوابع أولاً ثم القضية.
  await db.from('notifications').delete().eq('case_id', caseId)
  await db.from('critical_deadlines').delete().eq('case_id', caseId)
  await db.from('case_lawyer_access').delete().eq('case_id', caseId)
  await db.from('sessions').delete().eq('case_id', caseId)

  const { error } = await db.from('cases').delete().eq('id', caseId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'تم حذف القضية نهائياً' })
}
