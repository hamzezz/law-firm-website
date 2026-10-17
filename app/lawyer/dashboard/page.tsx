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

  const { data: accessRows } = await supabase
    .from('case_lawyer_access')
    .select('case_id')
    .eq('lawyer_id', lawyerRow.id)

  const accessCaseIds = accessRows?.map((r) => r.case_id) || []

  const { data: primaryCases } = await supabase
    .from('cases')
    .select('id, case_number, title, case_type, status, court_name, opened_at, client_id, primary_lawyer_id, other_party')
    .eq('primary_lawyer_id', lawyerRow.id)

  const { data: openCases } = await supabase
    .from('cases')
    .select('id, case_number, title, case_type, status, court_name, opened_at, client_id, primary_lawyer_id, other_party')
    .is('primary_lawyer_id', null)

  let sharedCases: any[] = []
  if (accessCaseIds.length > 0) {
    const { data } = await supabase
      .from('cases')
      .select('id, case_number, title, case_type, status, court_name, opened_at, client_id, primary_lawyer_id, other_party')
      .in('id', accessCaseIds)
    sharedCases = data || []
  }

  const allCasesMap = new Map()
  ;[...(primaryCases || []), ...(openCases || []), ...sharedCases].forEach((c) => allCasesMap.set(c.id, c))
  const casesRaw = Array.from(allCasesMap.values())

  const caseIds = casesRaw.map((c) => c.id)

  const sessionsResult = caseIds.length > 0 ? await supabase
    .from('sessions')
    .select('id, session_date, title, case_id')
    .in('case_id', caseIds) : { data: [] }
  const lawyerSessions = sessionsResult.data

  const deadlinesResult = caseIds.length > 0 ? await supabase
    .from('critical_deadlines')
    .select('id, deadline_type, deadline_date, case_id')
    .in('case_id', caseIds)
    .eq('is_resolved', false) : { data: [] }
  const lawyerDeadlines = deadlinesResult.data

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

  // جلب اسم الموكل ورقم أقرب جلسة قادمة لكل قضية
  const cases = await Promise.all(
    casesRaw.map(async (c: any) => {
      let clientName = 'غير محدد'
      const { data: clientRow } = await supabase.from('clients').select('user_id').eq('id', c.client_id).single()
      if (clientRow) {
        const { data: clientUser } = await supabase.from('users').select('full_name').eq('id', clientRow.user_id).single()
        if (clientUser) clientName = clientUser.full_name
      }

      const { data: nextSession } = await supabase
        .from('sessions')
        .select('session_date')
        .eq('case_id', c.id)
        .eq('status', 'scheduled')
        .order('session_date', { ascending: true })
        .limit(1)
        .maybeSingle()

      return { ...c, clientName, nextSessionDate: nextSession?.session_date || null }
    })
  )

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
