import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { logAudit } from '@/lib/audit/log'

/**
 * إنشاء حساب طبّاع.
 *
 * يسلك مسلك إنشاء المحامي نفسه: حساب Auth ببريد اصطناعي على نطاق
 * الموظفين، ثم صفّ في users بدور typist. ولا صفّ له في lawyers —
 * فالطبّاع ليس محامياً ولا تظهر له قضايا المكتب.
 */
export async function POST(request: Request) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 })
  }

  const { data: appUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_id', user.id)
    .single()

  if (!appUser || appUser.role !== 'manager') {
    return NextResponse.json({ error: 'هذا الإجراء متاح للمدير فقط' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const fullName = (body?.fullName as string | undefined)?.trim()
  const phone = (body?.phone as string | undefined)?.trim()
  const username = (body?.username as string | undefined)?.trim().toLowerCase()
  const password = body?.password as string | undefined

  if (!fullName || !username || !password) {
    return NextResponse.json({ error: 'الاسم واسم المستخدم وكلمة المرور مطلوبة' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'كلمة المرور لا تقلّ عن ثمانية أحرف' }, { status: 400 })
  }

  if (!/^[a-z0-9._-]+$/.test(username)) {
    return NextResponse.json(
      { error: 'اسم المستخدم بالحروف اللاتينية والأرقام فقط، بلا مسافات' },
      { status: 400 }
    )
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // اسم مستخدم مأخوذ: نردّه برسالة مفهومة لا برسالة قاعدة بيانات
  const { data: taken } = await admin
    .from('users')
    .select('id')
    .eq('username', username)
    .maybeSingle()

  if (taken) {
    return NextResponse.json({ error: 'اسم المستخدم مستعمل بالفعل' }, { status: 400 })
  }

  const syntheticEmail = username + '@staff.lawfirm.internal'

  const { data: newAuthUser, error: authError } = await admin.auth.admin.createUser({
    email: syntheticEmail,
    password,
    email_confirm: true,
  })

  if (authError || !newAuthUser.user) {
    return NextResponse.json({ error: authError?.message || 'فشل إنشاء الحساب' }, { status: 400 })
  }

  const { data: newAppUser, error: userError } = await admin
    .from('users')
    .upsert(
      {
        auth_id: newAuthUser.user.id,
        role: 'typist',
        full_name: fullName,
        username,
        phone: phone || null,
        email: syntheticEmail,
      },
      { onConflict: 'auth_id' }
    )
    .select('id')
    .single()

  if (userError || !newAppUser) {
    /**
     * فشل صفّ users بعد نجاح حساب Auth يترك حساباً يتيماً لا يستطيع
     * صاحبه الدخول ولا يظهر في القوائم، ويمنع إعادة استعمال الاسم.
     * فنحذفه ونعيد الخطأ.
     */
    await admin.auth.admin.deleteUser(newAuthUser.user.id).catch(() => {})
    return NextResponse.json({ error: userError?.message || 'فشل إنشاء بيانات المستخدم' }, { status: 400 })
  }

  await logAudit(admin, appUser.id, 'typist_created', 'أنشأ حساب طبّاع: ' + fullName)

  return NextResponse.json({ success: true, username })
}
