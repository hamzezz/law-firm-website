import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { logAudit } from '@/lib/audit/log'

/**
 * إدارة من يطّلع على القضية.
 *
 * نُقل الإجراء إلى الخادم عمداً لثلاثة أسباب:
 *  - التحقّق من صفة المدير يقع هنا لا في المتصفّح.
 *  - كلّ منحٍ أو سحبٍ يُقيَّد في سجلّ التدقيق باسم فاعله ووقته.
 *  - الواجهة تعرف إن فشل الحفظ فعلاً، بدل أن يتبدّل المفتاح على الشاشة
 *    ولا يُكتب شيء في القاعدة — وهو عيب الأداة السابقة.
 *
 * نموذج الصلاحية في النظام:
 *  - primary_lawyer_id = null  →  القضية متاحة لجميع المحامين.
 *  - primary_lawyer_id = محامٍ →  مقصورة عليه، ومن مُنح في case_lawyer_access.
 */
export async function POST(request: Request) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }

  const { data: appUser } = await supabase
    .from('users')
    .select('id, role, full_name')
    .eq('auth_id', user.id)
    .single()

  if (!appUser || appUser.role !== 'manager') {
    return NextResponse.json({ error: 'هذا الإجراء متاح للمدير فقط' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 })
  }

  const action = String(body?.action || '')
  const caseId = String(body?.caseId || '')

  if (!caseId) {
    return NextResponse.json({ error: 'القضية غير محدّدة' }, { status: 400 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // بيانات القضية للتسجيل في السجلّ بعبارة مفهومة
  const { data: caseRow } = await admin
    .from('cases')
    .select('id, case_number, title, primary_lawyer_id')
    .eq('id', caseId)
    .single()

  if (!caseRow) {
    return NextResponse.json({ error: 'القضية غير موجودة' }, { status: 404 })
  }

  const caseLabel = (caseRow.case_number || '') + ' — ' + (caseRow.title || '')

  /** اسم المحامي للتسجيل */
  async function lawyerName(lawyerId: string): Promise<string> {
    const { data } = await admin
      .from('lawyers')
      .select('users ( full_name )')
      .eq('id', lawyerId)
      .single()
    const u: any = data ? (Array.isArray((data as any).users) ? (data as any).users[0] : (data as any).users) : null
    return u?.full_name || 'محامٍ'
  }

  // ═══ إتاحة القضية لجميع المحامين ═══
  if (action === 'open_to_all') {
    const { error } = await admin
      .from('cases')
      .update({ primary_lawyer_id: null })
      .eq('id', caseId)

    if (error) {
      return NextResponse.json({ error: 'تعذّر الحفظ: ' + error.message }, { status: 500 })
    }

    await logAudit(
      admin,
      appUser.id,
      'case_access_granted',
      'أتاح القضية ' + caseLabel + ' لجميع المحامين',
      { case_id: caseId, scope: 'all' }
    )

    return NextResponse.json({ ok: true, primaryLawyerId: null })
  }

  // ═══ قصر القضية على محامٍ مسؤول ═══
  if (action === 'restrict') {
    const primaryLawyerId = String(body?.primaryLawyerId || '')
    if (!primaryLawyerId) {
      return NextResponse.json(
        { error: 'اختر المحامي المسؤول أولاً، وإلا لن يطّلع على القضية أحد' },
        { status: 400 }
      )
    }

    const { error } = await admin
      .from('cases')
      .update({ primary_lawyer_id: primaryLawyerId })
      .eq('id', caseId)

    if (error) {
      return NextResponse.json({ error: 'تعذّر الحفظ: ' + error.message }, { status: 500 })
    }

    await logAudit(
      admin,
      appUser.id,
      'case_access_revoked',
      'قصر القضية ' + caseLabel + ' على المحامي ' + (await lawyerName(primaryLawyerId)) + ' ومن مُنح صلاحية الاطلاع',
      { case_id: caseId, scope: 'restricted', primary_lawyer_id: primaryLawyerId }
    )

    return NextResponse.json({ ok: true, primaryLawyerId })
  }

  // ═══ منح محامٍ صلاحية الاطلاع ═══
  if (action === 'grant') {
    const lawyerId = String(body?.lawyerId || '')
    if (!lawyerId) return NextResponse.json({ error: 'المحامي غير محدّد' }, { status: 400 })

    /**
     * تحقّقٌ قبل الإدراج، لا upsert: الأخير يتطلّب قيداً فريداً على
     * (case_id, lawyer_id) لم يُتحقّق من وجوده في القاعدة، وغيابه يُفشل
     * الطلب كلّه. وهذا الطريق سليم في الحالين.
     */
    const { data: existing } = await admin
      .from('case_lawyer_access')
      .select('case_id')
      .eq('case_id', caseId)
      .eq('lawyer_id', lawyerId)
      .maybeSingle()

    if (!existing) {
      const { error } = await admin
        .from('case_lawyer_access')
        .insert({ case_id: caseId, lawyer_id: lawyerId, access_level: 'viewer' })

      if (error) {
        return NextResponse.json({ error: 'تعذّر المنح: ' + error.message }, { status: 500 })
      }
    }

    await logAudit(
      admin,
      appUser.id,
      'case_access_granted',
      'منح المحامي ' + (await lawyerName(lawyerId)) + ' صلاحية الاطلاع على القضية ' + caseLabel,
      { case_id: caseId, lawyer_id: lawyerId }
    )

    return NextResponse.json({ ok: true })
  }

  // ═══ سحب صلاحية الاطلاع ═══
  if (action === 'revoke') {
    const lawyerId = String(body?.lawyerId || '')
    if (!lawyerId) return NextResponse.json({ error: 'المحامي غير محدّد' }, { status: 400 })

    const { error } = await admin
      .from('case_lawyer_access')
      .delete()
      .eq('case_id', caseId)
      .eq('lawyer_id', lawyerId)

    if (error) {
      return NextResponse.json({ error: 'تعذّر السحب: ' + error.message }, { status: 500 })
    }

    await logAudit(
      admin,
      appUser.id,
      'case_access_revoked',
      'سحب صلاحية الاطلاع على القضية ' + caseLabel + ' من المحامي ' + (await lawyerName(lawyerId)),
      { case_id: caseId, lawyer_id: lawyerId }
    )

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 })
}

/** قراءة الحالة الحالية لقضية: من يطّلع عليها الآن */
export async function GET(request: Request) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

  const { data: appUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_id', user.id)
    .single()

  if (!appUser || appUser.role !== 'manager') {
    return NextResponse.json({ error: 'هذا الإجراء متاح للمدير فقط' }, { status: 403 })
  }

  const caseId = new URL(request.url).searchParams.get('caseId') || ''
  if (!caseId) return NextResponse.json({ error: 'القضية غير محدّدة' }, { status: 400 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [caseResult, accessResult] = await Promise.all([
    admin.from('cases').select('id, primary_lawyer_id').eq('id', caseId).single(),
    admin.from('case_lawyer_access').select('lawyer_id').eq('case_id', caseId),
  ])

  return NextResponse.json({
    primaryLawyerId: caseResult.data?.primary_lawyer_id || null,
    granted: (accessResult.data || []).map((r: any) => r.lawyer_id),
  })
}
