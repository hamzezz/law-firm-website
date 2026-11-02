import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { logAudit } from '@/lib/audit/log'

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

  const [authResult, body] = await Promise.all([
    supabase.auth.getUser(),
    request.json(),
  ])

  const user = authResult.data.user
  if (!user) {
    return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 })
  }

  const { targetUserId, confirmName } = body || {}

  if (!targetUserId || !confirmName) {
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [requesterRes, targetRes] = await Promise.all([
    supabase.from('users').select('id, role, username').eq('auth_id', user.id).single(),
    admin.from('users').select('id, auth_id, role, full_name, username').eq('id', targetUserId).single(),
  ])

  const requester = requesterRes.data

  if (!requester || requester.role !== 'manager' || requester.username !== 'tech') {
    return NextResponse.json({ error: 'هذا الإجراء متاح للتقني فقط' }, { status: 403 })
  }

  const targetUser = targetRes.data

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
    if (targetUser.role === 'client') {
      const { data: clientRow } = await admin
        .from('clients')
        .select('id')
        .eq('user_id', targetUser.id)
        .maybeSingle()

      if (clientRow) {
        /**
         * ملفّ الموكّل لا يُتلَف.
         *
         * كان الحذف يمحو قضايا الموكّل ومعها — بالتسلسل — جلساتها
         * ومحاضرها ومستنداتها ومواعيدها الحرجة. وكان معلناً في الواجهة
         * ومسبوقاً بتأكيد، لكنّه يخالف واجب المحامي في حفظ ملفّات
         * موكّليه: ملفّ القضية سجلٌّ مهنيّ لا يُتلف بحذف حساب دخول.
         *
         * والقرار قرار المكتب: «لا يجوز تلف ملف موكّل أصلاً».
         *
         * ويُفرض هنا في الخادم لا في الشاشة وحدها، فالتحذير يُقرأ
         * ويُتجاوز، والرفض لا يُتجاوز.
         */
        const { count: caseCount } = await admin
          .from('cases')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', clientRow.id)

        if ((caseCount || 0) > 0) {
          return NextResponse.json(
            {
              error:
                'لا يمكن حذف حساب موكّل له ' + caseCount + ' قضية. ملفّ القضية سجلٌّ مهنيّ ' +
                'لا يُتلف بحذف الحساب. وإن أردت منعه من الدخول فغيّر كلمة مروره من «إدارة الحسابات».',
            },
            { status: 409 }
          )
        }
      }

      const r1 = await admin.from('clients').delete().eq('user_id', targetUser.id)
      if (r1.error) return NextResponse.json({ error: 'فشل حذف بيانات الموكل: ' + r1.error.message }, { status: 500 })
    } else if (targetUser.role === 'lawyer') {
      const { data: lawyerRow } = await admin
        .from('lawyers')
        .select('id')
        .eq('user_id', targetUser.id)
        .maybeSingle()

      if (lawyerRow) {
        // للمحامي: لا نحذف القضايا، بل نحوّلها إلى "غير مخصصة" حفاظاً على بيانات الموكلين
        await Promise.all([
          admin.from('cases').update({ primary_lawyer_id: null }).eq('primary_lawyer_id', lawyerRow.id),
          admin.from('case_lawyer_access').delete().eq('lawyer_id', lawyerRow.id),
        ])
      }

      const r2 = await admin.from('lawyers').delete().eq('user_id', targetUser.id)
      if (r2.error) return NextResponse.json({ error: 'فشل حذف بيانات المحامي: ' + r2.error.message }, { status: 500 })
    }

    await Promise.all([
      admin.from('notifications').delete().eq('recipient_user_id', targetUser.id),
      admin.from('push_subscriptions').delete().eq('user_id', targetUser.id),
      admin.from('audit_log').delete().eq('user_id', targetUser.id),
    ])

    const r3 = await admin.from('users').delete().eq('id', targetUser.id)
    if (r3.error) return NextResponse.json({ error: 'فشل حذف الحساب: ' + r3.error.message }, { status: 500 })

    const r4 = await admin.auth.admin.deleteUser(targetUser.auth_id)
    if (r4.error) return NextResponse.json({ error: 'فشل حذف حساب الدخول: ' + r4.error.message }, { status: 500 })

    await logAudit(admin, requester.id, 'account_deleted', 'حذف حساب: ' + targetUser.full_name + ' (' + targetUser.username + ')')

    return NextResponse.json({ success: true, deletedName: targetUser.full_name })
  } catch (err) {
    return NextResponse.json(
      { error: 'فشل الحذف: ' + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    )
  }
}