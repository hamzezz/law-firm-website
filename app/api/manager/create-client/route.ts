import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 })
  }

  const { data: appUser } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', user.id)
    .single()

  if (!appUser || appUser.role !== 'manager') {
    return NextResponse.json({ error: 'هذا الإجراء متاح للمدير فقط' }, { status: 403 })
  }

  const body = await request.json()
  const { fullName, phone, username, password } = body

  if (!fullName || !username || !password) {
    return NextResponse.json({ error: 'الحقول المطلوبة ناقصة' }, { status: 400 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const syntheticEmail = `${username.trim().toLowerCase()}@clients.lawfirm.internal`

  // 1) إنشاء حساب Auth
  const { data: newAuthUser, error: authError } = await admin.auth.admin.createUser({
    email: syntheticEmail,
    password: password,
    email_confirm: true,
  })

  if (authError || !newAuthUser.user) {
    return NextResponse.json({ error: authError?.message || 'فشل إنشاء الحساب' }, { status: 400 })
  }

  // 2) إنشاء أو تحديث صف في public.users
  // (قد يكون trigger داخلي أنشأ صفاً تلقائياً عند إنشاء حساب Auth، لذا نستخدم upsert)
  const { data: newAppUser, error: userError } = await admin
    .from('users')
    .upsert(
      {
        auth_id: newAuthUser.user.id,
        role: 'client',
        full_name: fullName,
        username: username.trim().toLowerCase(),
        phone: phone || null,
        email: syntheticEmail,
      },
      { onConflict: 'auth_id' }
    )
    .select('id')
    .single()

  if (userError || !newAppUser) {
    return NextResponse.json({ error: userError?.message || 'فشل إنشاء بيانات المستخدم' }, { status: 400 })
  }

  // 3) إنشاء صف في public.clients
  const { error: clientError } = await admin
    .from('clients')
    .insert({
      user_id: newAppUser.id,
    })

  if (clientError) {
    return NextResponse.json({ error: clientError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, username: username.trim().toLowerCase() })
}
