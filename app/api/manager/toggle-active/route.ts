import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { logAudit } from '@/lib/audit/log'

/**
 * إيقاف دخول حساب أو إعادة تفعيله.
 *
 * وهذا هو البديل المهنيّ عن حذف الحساب: ملفّ القضية سجلٌّ لا يُتلَف،
 * فالمطلوب منع الدخول لا محو السجلّ. والعمود `users.is_active` كان
 * موجوداً في قاعدة البيانات ولا يقرأه سطرٌ واحد في المشروع.
 *
 * ويسلك هذا الباب مسلك change-username وchange-user-password في
 * الصلاحيات حرفاً بحرف، فلا يختلف سلوك الأبواب الثلاثة مع الوقت.
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
  const active = body?.active

  if (!targetUserId || typeof active !== 'boolean') {
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: targetUser } = await admin
    .from('users')
    .select('id, role, username, full_name, is_active')
    .eq('id', targetUserId)
    .single()

  if (!targetUser) {
    return NextResponse.json({ error: 'المستخدم المستهدف غير موجود' }, { status: 404 })
  }

  /**
   * لا يُوقف أحدٌ نفسه. وهذا ليس تأدّباً: المدير الذي يوقف حسابه
   * يُخرج نفسه من اللوحة التي تملك وحدها إعادة التفعيل.
   */
  if (targetUser.id === requester.id) {
    return NextResponse.json({ error: 'لا يمكنك إيقاف حسابك أنت' }, { status: 400 })
  }

  // حماية: المدير غير tech لا يمسّ حساب مدير — كقاعدة كلمة المرور والاسم
  if (requester.username !== 'tech' && targetUser.role === 'manager') {
    return NextResponse.json({ error: 'لا تملك صلاحية إيقاف حساب مدير' }, { status: 403 })
  }

  if (targetUser.is_active === active) {
    return NextResponse.json(
      { error: active ? 'الحساب مفعَّل بالفعل' : 'الحساب موقوف بالفعل' },
      { status: 400 }
    )
  }

  const { error: rowError } = await admin
    .from('users')
    .update({ is_active: active })
    .eq('id', targetUser.id)

  if (rowError) {
    return NextResponse.json({ error: 'تعذّر تحديث الحساب: ' + rowError.message }, { status: 500 })
  }

  await logAudit(
    admin,
    requester.id,
    active ? 'account_reactivated' : 'account_suspended',
    (active ? 'أعاد تفعيل دخول الحساب: ' : 'أوقف دخول الحساب: ') +
      (targetUser.full_name || '') + ' (' + targetUser.username + ')'
  )

  return NextResponse.json({ success: true, active })
}
