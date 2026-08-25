import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function normalizeForCompare(text: string): string {
  return (text || '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u0652]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

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

  if (!requester || requester.role !== 'manager' || requester.username !== 'tech') {
    return NextResponse.json({ error: 'هذا الإجراء متاح للمدير التقني فقط' }, { status: 403 })
  }

  const { targetUserId, confirmName } = await request.json()

  if (!targetUserId || !confirmName) {
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: targetUser } = await admin
    .from('users')
    .select('id, auth_id, role, full_name, username')
    .eq('id', targetUserId)
    .single()

  if (!targetUser) {
    return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 })
  }

  // حماية: لا يمكن حذف حساب مدير إطلاقاً
  if (targetUser.role === 'manager') {
    return NextResponse.json({ error: 'لا يمكن حذف حساب مدير' }, { status: 403 })
  }

  // حماية: التأكد من مطابقة الاسم المكتوب يدوياً
  if (normalizeForCompare(confirmName) !== normalizeForCompare(targetUser.full_name)) {
    return NextResponse.json({ error: 'الاسم المكتوب لا يطابق اسم الحساب' }, { status: 400 })
  }

  try {
    // حذف الملف المرتبط (clients أو lawyers) - القضايا تُحذف تلقائياً بـ cascade
    if (targetUser.role === 'client') {
      await admin.from('clients').delete().eq('user_id', targetUser.id)
    } else if (targetUser.role === 'lawyer') {
      await admin.from('lawyers').delete().eq('user_id', targetUser.id)
    }

    // حذف الإشعارات واشتراكات Push المرتبطة
    await admin.from('notifications').delete().eq('recipient_user_id', targetUser.id)
    await admin.from('push_subscriptions').delete().eq('user_id', targetUser.id)

    // حذف صف users
    await admin.from('users').delete().eq('id', targetUser.id)

    // حذف حساب Auth
    await admin.auth.admin.deleteUser(targetUser.auth_id)

    return NextResponse.json({ success: true, deletedName: targetUser.full_name })
  } catch (err) {
    return NextResponse.json(
      { error: 'فشل الحذف: ' + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    )
  }
}
