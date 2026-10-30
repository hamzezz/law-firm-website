import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { auditClient } from '@/lib/audit/log'
import { buildHeaderDocx } from '@/lib/print/docx'

export const dynamic = 'force-dynamic'

/**
 * ملف Word بترويسة القضية، يُولَّد عند الطلب.
 *
 * المحكمة ورقم القضية والأطراف تُنقل من بيانات القضية لا تُكتب باليد —
 * وهذا يمنع أخطر خطأ في هذا العمل: رقم قضية أو اسم محكمة خاطئ في
 * مذكّرةٍ لها ميعاد.
 *
 * ولا يُحفظ الملف في المخزن: يُبنى في كل مرة من البيانات القائمة، فلا
 * تبقى نسخةٌ قديمة تحمل اسم محكمةٍ صُحِّح بعدها.
 */

function arabicDigits(s: string): string {
  const d = '٠١٢٣٤٥٦٧٨٩'
  return s.replace(/[0-9]/g, (c) => d[Number(c)])
}

function todayLabel(): string {
  const n = new Date()
  const s =
    String(n.getDate()).padStart(2, '0') + '/' +
    String(n.getMonth() + 1).padStart(2, '0') + '/' +
    n.getFullYear()
  return arabicDigits(s)
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 })

  const { data: appUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_id', user.id)
    .single()

  if (!appUser) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 })

  const admin = auditClient()

  const { data: req } = await admin
    .from('print_requests')
    .select('id, case_id, assigned_to, requested_by, doc_type')
    .eq('id', id)
    .maybeSingle()

  if (!req) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })

  const { data: caseRow } = await admin
    .from('cases')
    .select('id, case_number, title, court_name, case_type, other_party, primary_lawyer_id, clients ( users ( full_name ) )')
    .eq('id', req.case_id)
    .maybeSingle()

  if (!caseRow) return NextResponse.json({ error: 'القضية غير موجودة' }, { status: 404 })

  /* ═══ الصلاحية — كبوابة المستندات نفسها ═══ */

  let allowed = false
  if (appUser.role === 'manager') {
    allowed = true
  } else if (appUser.role === 'typist') {
    allowed = req.assigned_to === appUser.id || req.assigned_to === null
  } else if (appUser.role === 'lawyer') {
    const { data: lawyerRow } = await admin
      .from('lawyers').select('id').eq('user_id', appUser.id).maybeSingle()
    if (lawyerRow) {
      if (caseRow.primary_lawyer_id === lawyerRow.id || caseRow.primary_lawyer_id === null) {
        allowed = true
      } else {
        const { data: access } = await admin
          .from('case_lawyer_access')
          .select('case_id')
          .eq('case_id', caseRow.id)
          .eq('lawyer_id', lawyerRow.id)
          .maybeSingle()
        allowed = Boolean(access)
      }
    }
  }

  if (!allowed) {
    return NextResponse.json({ error: 'لا تملك صلاحية على هذه القضية' }, { status: 403 })
  }

  /* ═══ البناء ═══ */

  const clientJoin: any = (caseRow as any).clients
  const clientUser: any = clientJoin
    ? (Array.isArray(clientJoin) ? clientJoin[0]?.users : clientJoin.users)
    : null
  const clientRow: any = Array.isArray(clientUser) ? clientUser[0] : clientUser

  const buf = buildHeaderDocx({
    courtName: caseRow.court_name || '',
    caseNumber: caseRow.case_number || '',
    caseType: caseRow.case_type || '',
    clientName: clientRow?.full_name || '',
    otherParty: caseRow.other_party || '',
    docType: req.doc_type || '',
    dateLabel: todayLabel(),
  })

  const safeNumber = (caseRow.case_number || 'قضية').replace(/[\\/:*?"<>|]/g, '-')
  const fileName = 'ترويسة-' + safeNumber + '.docx'

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      // الاسم العربي يُرسل مرمَّزاً، ومعه بديلٌ لاتيني لمن لا يفهم الترميز
      'Content-Disposition':
        'attachment; filename="case-header.docx"; filename*=UTF-8\'\'' + encodeURIComponent(fileName),
      'Cache-Control': 'no-store',
    },
  })
}
