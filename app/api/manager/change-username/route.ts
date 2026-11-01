import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { logAudit } from '@/lib/audit/log'

/**
 * تغيير اسم مستخدم حساب قائم.
 *
 * اسم المستخدم مخزَّن في ثلاثة مواضع يجب أن تتغيّر معاً:
 *   1) بريد حساب المصادقة (وهو ما يُبنى منه الدخول فعلياً)
 *   2) users.username
 *   3) users.email
 *
 * فلو تغيّر الأول وحده ظهر الاسم القديم في اللوحة، ولو تغيّر الأخيران
 * وحدهما عجز صاحب الحساب عن الدخول نهائياً.
 *
 * ويسلك المسار مسلك change-user-password نفسه في الصلاحيات، فلا يختلف
 * سلوك البابين مع الوقت.
 */
export async function POST(request: Request) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 })
  }

  const { data: requester } = await supabase
    .from('users')
    .select('id, role, username')
    .eq('auth_id', user.id)
    .single()

  if (!requester || requester.role !== 'manager') {
    return NextResponse.json({ error: 'هذا الإجراء متاح للمدير فقط' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const targetUserId = body?.targetUserId as string | undefined
  const newUsername = (body?.newUsername as string | undefined)?.trim().toLowerCase()

  if (!targetUserId || !newUsername) {
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  }

  if (newUsername.length < 3) {
    return NextResponse.json({ error: 'اسم المستخدم ثلاثة أحرف فأكثر' }, { status: 400 })
  }

  // نفس شرط إنشاء الحسابات حرفاً بحرف، كي لا يُنشأ اسم لا يصلح بريداً
  if (!/^[a-z0-9._-]+$/.test(newUsername)) {
    return NextResponse.json(
      { error: 'اسم المستخدم بالحروف اللاتينية والأرقام فقط، بلا مسافات' },
      { status: 400 }
    )
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: targetUser } = await admin
    .from('users')
    .select('id, auth_id, role, username, email, full_name')
    .eq('id', targetUserId)
    .single()

  if (!targetUser) {
    return NextResponse.json({ error: 'المستخدم المستهدف غير موجود' }, { status: 404 })
  }

  if (targetUser.username === newUsername) {
    return NextResponse.json({ error: 'هذا هو الاسم الحالي' }, { status: 400 })
  }

  // حماية: المدير غير tech لا يغيّر اسم حساب مدير — كقاعدة كلمة المرور
  if (requester.username !== 'tech' && targetUser.role === 'manager') {
    return NextResponse.json({ error: 'لا تملك صلاحية تغيير اسم حساب مدير' }, { status: 403 })
  }

  const { data: taken } = await admin
    .from('users')
    .select('id')
    .eq('username', newUsername)
    .maybeSingle()

  if (taken) {
    return NextResponse.json({ error: 'اسم المستخدم مستعمل بالفعل' }, { status: 400 })
  }

  /**
   * النطاق يُؤخذ من بريد الحساب نفسه لا من دوره: الموظفون على
   * staff.lawfirm.internal والموكّلون على clients.lawfirm.internal،
   * واشتقاقه من الدور يخطئ يوماً ما إن أُضيف دور جديد.
   */
  const currentEmail = String(targetUser.email || '')
  const at = currentEmail.lastIndexOf('@')
  const domain = at > -1 ? currentEmail.slice(at + 1) : 'staff.lawfirm.internal'
  const newEmail = newUsername + '@' + domain

  /**
   * email_confirm: true مقصود. النطاق وهميّ لا يستقبل بريداً، فلو تُرك
   * التأكيد مطلوباً لبقي البريد الجديد معلّقاً وعجز صاحبه عن الدخول.
   */
  const { error: authError } = await admin.auth.admin.updateUserById(targetUser.auth_id, {
    email: newEmail,
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const { error: rowError } = await admin
    .from('users')
    .update({ username: newUsername, email: newEmail })
    .eq('id', targetUser.id)

  if (rowError) {
    /**
     * حساب نصف مغيَّر أسوأ الحالات: بريد المصادقة جديد والجدول قديم،
     * فلا الاسم القديم يدخل ولا الجديد يظهر. نعيد البريد القديم ونعتذر.
     */
    await admin.auth.admin
      .updateUserById(targetUser.auth_id, { email: currentEmail, email_confirm: true })
      .catch(() => {})

    return NextResponse.json(
      { error: 'تعذّر تحديث بيانات المستخدم، وأُعيد الاسم القديم كما كان' },
      { status: 400 }
    )
  }

  await logAudit(
    admin,
    requester.id,
    'username_changed',
    'غيّر اسم المستخدم للحساب: ' + (targetUser.full_name || '') +
      ' من ' + targetUser.username + ' إلى ' + newUsername
  )

  return NextResponse.json({ success: true, username: newUsername })
}
