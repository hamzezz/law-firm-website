import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

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

  const { targetUserId, newPassword } = await request.json()

  if (!targetUserId || !newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: 'بيانات غير صالحة (كلمة المرور 6 أحرف على الأقل)' }, { status: 400 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: targetUser } = await admin
    .from('users')
    .select('id, auth_id, role, username')
    .eq('id', targetUserId)
    .single()

  if (!targetUser) {
    return NextResponse.json({ error: 'المستخدم المستهدف غير موجود' }, { status: 404 })
  }

  // حماية: المدير العادي (username != tech) لا يقدر يغيّر كلمة مرور حساب tech أو أي مدير آخر
  if (requester.username !== 'tech') {
    if (targetUser.role === 'manager') {
      return NextResponse.json({ error: 'لا تملك صلاحية تغيير كلمة مرور حساب مدير' }, { status: 403 })
    }
  }

  const { error } = await admin.auth.admin.updateUserById(targetUser.auth_id, {
    password: newPassword,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, username: targetUser.username })
}
