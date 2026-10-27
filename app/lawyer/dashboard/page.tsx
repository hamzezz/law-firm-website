import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/app/staff/logout-button'
import ChangePassword from '@/app/components/change-password'
import NotificationBell from './notification-bell'
import EnableNotifications from '@/app/components/enable-notifications'
import RegisterDeviceToken from '@/app/components/register-device-token'
import ViewSwitcher from './view-switcher'

export default async function LawyerDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/portal.html')

  const { data: appUser } = await supabase
    .from('users')
    .select('id, role, full_name')
    .eq('auth_id', user.id)
    .single()

  if (!appUser || appUser.role !== 'lawyer') {
    redirect('/portal.html')
  }

  const { data: lawyerRow } = await supabase
    .from('lawyers')
    .select('id, specialization, bar_number')
    .eq('user_id', appUser.id)
    .single()

  if (!lawyerRow) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" dir="rtl">
        <p className="text-slate-600">لم يتم العثور على بيانات المحامي المرتبطة بحسابك.</p>
      </div>
    )
  }

  const CASE_FIELDS =
    'id, case_number, title, case_type, status, court_name, opened_at, client_id, primary_lawyer_id, other_party'

  /**
   * القضايا الثلاث الفئات في موجة واحدة.
   *
   * كانت القضايا المشتركة تُجلب بموجتين: معرّفات من case_lawyer_access
   * ثم القضايا بتلك المعرّفات. وصارت تأتي مضمومة في الاستعلام نفسه.
   */
  const [accessResult, primaryResult, openResult] = await Promise.all([
    supabase
      .from('case_lawyer_access')
      .select('case_id, cases ( ' + CASE_FIELDS + ' )')
      .eq('lawyer_id', lawyerRow.id),
    supabase.from('cases').select(CASE_FIELDS).eq('primary_lawyer_id', lawyerRow.id),
    supabase.from('cases').select(CASE_FIELDS).is('primary_lawyer_id', null),
  ])

  const primaryCases = primaryResult.data
  const openCases = openResult.data

  const sharedCases: any[] = (accessResult.data || [])
    .map((r: any) => (Array.isArray(r.cases) ? r.cases[0] : r.cases))
    .filter(Boolean)

  const allCasesMap = new Map()
  ;[...(primaryCases || []), ...(openCases || []), ...sharedCases].forEach((c) => allCasesMap.set(c.id, c))
  const casesRaw = Array.from(allCasesMap.values())

  const caseIds = casesRaw.map((c) => c.id)

  const clientIds = Array.from(
    new Set(casesRaw.map((c: any) => c.client_id).filter(Boolean))
  )

  /** معرّفات القضايا المغلقة — تُحسب قبل الموجة ليأتي استعلام مستنداتها معها */
  const closedCaseIds = casesRaw.filter((c: any) => c.status === 'closed').map((c: any) => c.id)

  // الجلسات والمواعيد والموكلون ومستندات المغلقة — دفعة واحدة
  const [sessionsResult, deadlinesResult, clientsResult, closedDocsResult] = await Promise.all([
    caseIds.length > 0
      ? supabase
          .from('sessions')
          .select('id, session_date, title, case_id, status')
          .in('case_id', caseIds)
          .order('session_date', { ascending: true })
      : Promise.resolve({ data: [] as any[] }),
    caseIds.length > 0
      ? supabase
          .from('critical_deadlines')
          .select('id, deadline_type, deadline_date, case_id')
          .in('case_id', caseIds)
          .eq('is_resolved', false)
      : Promise.resolve({ data: [] as any[] }),
    clientIds.length > 0
      ? supabase.from('clients').select('id, users ( full_name )').in('id', clientIds)
      : Promise.resolve({ data: [] as any[] }),
    closedCaseIds.length > 0
      ? supabase.from('documents').select('case_id, storage_provider').in('case_id', closedCaseIds)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const lawyerSessions = sessionsResult.data
  const lawyerDeadlines = deadlinesResult.data

  // أسماء الموكّلين جاءت مضمومة مع صفوفهم، فلا استعلام ثانٍ لها
  const clientNameById: Record<string, string> = {}
  ;(clientsResult.data || []).forEach((r: any) => {
    const u = Array.isArray(r.users) ? r.users[0] : r.users
    if (u?.full_name) clientNameById[r.id] = u.full_name
  })

  /**
   * أقرب جلسة مجدولة لكل قضية — تُحسب من الجلسات المجلوبة أعلاه.
   * كانت تُجلب باستعلام منفصل لكل قضية (٥٠ قضية = ٥٠ استعلاماً)، وهي
   * موجودة أصلاً في النتيجة نفسها. والترتيب تصاعدي، فأول ما يُصادَف هو الأقرب.
   */
  const nextSessionByCase: Record<string, string> = {}
  ;(lawyerSessions || []).forEach((s: any) => {
    if (s.status !== 'scheduled') return
    if (!nextSessionByCase[s.case_id]) nextSessionByCase[s.case_id] = s.session_date
  })

  const caseTitleMap = {}
  casesRaw.forEach((c) => { caseTitleMap[c.id] = c.title })

  const calendarEvents = [
    ...(lawyerSessions || []).map((s) => ({
      date: new Date(s.session_date).toISOString().slice(0, 10),
      title: (caseTitleMap[s.case_id] || s.title) + ' - جلسة',
      caseId: s.case_id,
      type: 'session',
    })),
    ...(lawyerDeadlines || []).map((d) => ({
      date: d.deadline_date,
      title: (caseTitleMap[d.case_id] || '') + ' - ' + d.deadline_type,
      caseId: d.case_id,
      type: 'deadline',
    })),
  ]

  /**
   * القضايا المؤرشفة: المغلقة التي انتقلت كل مستنداتها إلى R2 فعلاً —
   * وهو تعريف الأرشفة نفسه المعتمد في لوحة المدير، كيلا يختلف معنى
   * «مؤرشفة» بين شاشتين في نظامٍ واحد.
   *
   * والمغلقة التي تعثّرت أرشفتها تبقى في «قضاياي»، فلا تغيب عن المحامي
   * وهي تنتظر إجراءً.
   */
  const pendingByCase: Record<string, number> = {}
  ;(closedDocsResult.data || []).forEach((d: any) => {
    if (d.storage_provider !== 'r2') {
      pendingByCase[d.case_id] = (pendingByCase[d.case_id] || 0) + 1
    }
  })

  const archivedIds = new Set(closedCaseIds.filter((id: string) => !pendingByCase[id]))

  // اسم الموكل وأقرب جلسة — من الخرائط المبنيّة أعلاه، بلا أي استعلام إضافي
  const allCases = casesRaw.map((c: any) => ({
    ...c,
    clientName: clientNameById[c.client_id] || 'غير محدد',
    nextSessionDate: nextSessionByCase[c.id] || null,
  }))

  const cases = allCases.filter((c: any) => !archivedIds.has(c.id))
  const archivedCases = allCases
    .filter((c: any) => archivedIds.has(c.id))
    .sort((a: any, b: any) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime())

  cases.sort((a, b) => {
    if (a.nextSessionDate && b.nextSessionDate) {
      return new Date(a.nextSessionDate).getTime() - new Date(b.nextSessionDate).getTime()
    }
    if (a.nextSessionDate) return -1
    if (b.nextSessionDate) return 1
    return new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime()
  })

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <RegisterDeviceToken />

      <ViewSwitcher
        cases={cases}
        archivedCases={archivedCases}
        calendarEvents={calendarEvents}
        lawyerName={appUser.full_name}
        specialization={lawyerRow.specialization}
        bell={<NotificationBell userId={appUser.id} />}
        headerActions={
          <div className="contents">
            <EnableNotifications userId={appUser.id} />
            <ChangePassword />
            <LogoutButton />
          </div>
        }
        accountActions={
          <div className="contents">
            <div className="py-4 border-b border-slate-100">
              <EnableNotifications userId={appUser.id} />
            </div>
            <ChangePassword className="w-full text-right text-sm font-medium text-slate-700 py-4 border-b border-slate-100" />
            <LogoutButton className="w-full text-right text-sm font-medium text-red-600 py-4" />
          </div>
        }
      />
    </div>
  )
}
