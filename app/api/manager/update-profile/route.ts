import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { logAudit } from '@/lib/audit/log'
import { localPhoneKey } from '@/lib/whatsapp/client'

/**
 * تعديل اسم صاحب الحساب ورقم هاتفه.
 *
 * الاسم والهاتف كلاهما في users — لا في clients ولا lawyers، فهذان
 * جدولا ربطٍ لا يحملان بيانات شخصية. فالتحديث في موضعٍ واحد.
 *
 * ويسلك مسلك change-username نفسه في الصلاحيات حرفاً بحرف، فلا
 * يفترق البابان مع الوقت.
 *
 * ورقم الهاتف ليس تفصيلاً تجميلياً: بوت واتساب يتعرّف على الموكّل به،
 * فالرقم الخاطئ يعني موكّلاً لا يعرفه النظام.
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
  const fullName = (body?.fullName as string | undefined)?.trim()
  const rawPhone = (body?.phone as string | undefined)?.trim() ?? ''

  if (!targetUserId || !fullName) {
    return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 })
  }

  if (fullName.length < 3) {
    return NextResponse.json({ error: 'الاسم ثلاثة أحرف فأكثر' }, { status: 400 })
  }

  /**
   * الهاتف اختياريّ، لكنه إن كُتب فليكن رقماً يمنياً صالحاً.
   * ويُخزَّن محلّياً (٩ أرقام) كما تُخزَّن بقية الأرقام في النظام،
   * ومطابقته مع واتساب تجري عبر localPhoneKey الذي يوحّد الصيغ.
   */
  let phone: string | null = null

  if (rawPhone) {
    const key = localPhoneKey(rawPhone)

    if (!/^7\d{8}$/.test(key)) {
      return NextResponse.json(
        { error: 'رقم الهاتف غير صالح. اكتبه تسعة أرقام يبدأ بـ7، مثل 771234567' },
        { status: 400 }
      )
    }
    phone = key
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: targetUser } = await admin
    .from('users')
    .select('id, role, full_name, phone, username')
    .eq('id', targetUserId)
    .single()

  if (!targetUser) {
    return NextResponse.json({ error: 'المستخدم المستهدف غير موجود' }, { status: 404 })
  }

  // الحماية نفسها المعمول بها في تغيير الاسم وكلمة المرور
  if (requester.username !== 'tech' && targetUser.role === 'manager') {
    return NextResponse.json({ error: 'لا تملك صلاحية تعديل بيانات حساب مدير' }, { status: 403 })
  }

  const sameName = targetUser.full_name === fullName
  const samePhone = (targetUser.phone || null) === phone

  if (sameName && samePhone) {
    return NextResponse.json({ error: 'لا جديد لتحديثه' }, { status: 400 })
  }

  /**
   * رقمٌ واحد لا يكون لشخصين: البوت يتعرّف بالرقم، فلو تكرّر لعرض
   * ملفّ موكّلٍ على آخر. والمقارنة بالمفتاح الموحَّد لا بالنصّ، لأن
   * الصيغ القديمة قد تختلف (بمفتاح الدولة أو بمسافات).
   */
  if (phone && !samePhone) {
    const { data: others } = await admin
      .from('users')
      .select('id, full_name, phone')
      .not('phone', 'is', null)
      .neq('id', targetUser.id)

    const clash = (others || []).find(function (u: any) {
      return localPhoneKey(u.phone) === phone
    })

    if (clash) {
      return NextResponse.json(
        { error: 'هذا الرقم مسجَّل بالفعل باسم «' + (clash.full_name || '') + '»' },
        { status: 400 }
      )
    }
  }

  const { error: updateError } = await admin
    .from('users')
    .update({ full_name: fullName, phone })
    .eq('id', targetUser.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 })
  }

  const changes: string[] = []
  if (!sameName) changes.push('الاسم: ' + (targetUser.full_name || '—') + ' ← ' + fullName)
  if (!samePhone) changes.push('الهاتف: ' + (targetUser.phone || '—') + ' ← ' + (phone || '—'))

  await logAudit(
    admin,
    requester.id,
    'profile_updated',
    'عدّل بيانات الحساب @' + targetUser.username + ' — ' + changes.join(' · ')
  )

  return NextResponse.json({ success: true, fullName, phone })
}
