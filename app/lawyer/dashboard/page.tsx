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

  // ثلاثة استعلامات مستقلّة لا ينتظر بعضها بعضاً
  const [accessResult, primaryResult, openResult] = await Promise.all([
    supabase.from('case_lawyer_access').select('case_id').eq('lawyer_id', lawyerRow.id),
    supabase.from('cases').select(CASE_FIELDS).eq('primary_lawyer_id', lawyerRow.id),
    supabase.from('cases').select(CASE_FIELDS).is('primary_lawyer_id', null),
  ])

  const accessCaseIds = accessResult.data?.map((r: any) => r.case_id) || []
  const primaryCases = primaryResult.data
  const openCases = openResult.data

  let sharedCases: any[] = []
  if (accessCaseIds.length > 0) {
    const { data } = await supabase
      .from('cases')
      .select(CASE_FIELDS)
      .in('id', accessCaseIds)
    sharedCases = data || []
  }

  const allCasesMap = new Map()
  ;[...(primaryCases || []), ...(openCases || []), ...sharedCases].forEach((c) => allCasesMap.set(c.id, c))
  const casesRaw = Array.from(allCasesMap.values())

  const caseIds = casesRaw.map((c) => c.id)

  const clientIds = Array.from(
    new Set(casesRaw.map((c: any) => c.client_id).filter(Boolean))
  )

  // الجلسات والمواعيد والموكلون — دفعة واحدة، ولا ينتظر بعضها بعضاً
  const [sessionsResult, deadlinesResult, clientsResult] = await Promise.all([
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
      ? supabase.from('clients').select('id, user_id').in('id', clientIds)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const lawyerSessions = sessionsResult.data
  const lawyerDeadlines = deadlinesResult.data

  // أسماء الموكّلين: استعلام واحد لا استعلامان لكل قضية
  const clientRows = clientsResult.data || []
  const clientUserIds = clientRows.map((r: any) => r.user_id).filter(Boolean)

  const { data: clientUsers } = clientUserIds.length > 0
    ? await supabase.from('users').select('id, full_name').in('id', clientUserIds)
    : { data: [] as any[] }

  const userNameById: Record<string, string> = {}
  ;(clientUsers || []).forEach((u: any) => { userNameById[u.id] = u.full_name })

  const clientNameById: Record<string, string> = {}
  clientRows.forEach((r: any) => {
    const name = userNameById[r.user_id]
    if (name) clientNameById[r.id] = name
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

  // اسم الموكل وأقرب جلسة — من الخرائط المبنيّة أعلاه، بلا أي استعلام إضافي
  const cases = casesRaw.map((c: any) => ({
    ...c,
    clientName: clientNameById[c.client_id] || 'غير محدد',
    nextSessionDate: nextSessionByCase[c.id] || null,
  }))

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
