import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/app/staff/logout-button'
import ChangePassword from '@/app/components/change-password'
import NotificationBell from './notification-bell'
import EnableNotifications from '@/app/components/enable-notifications'
import ViewSwitcher from './view-switcher'

function statusBadge(status: string) {
  const s = status?.toLowerCase() || ''
  if (s.includes('active')) return 'bg-green-100 text-green-700'
  if (s.includes('postponed')) return 'bg-amber-100 text-amber-700'
  if (s.includes('closed')) return 'bg-slate-200 text-slate-700'
  return 'bg-blue-100 text-blue-700'
}

function statusLabel(status: string) {
  const map: Record<string, string> = { active: 'نشطة', postponed: 'مؤجلة', closed: 'مغلقة' }
  return map[status?.toLowerCase()] || status
}

export default async function LawyerDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/staff/login')

  const { data: appUser } = await supabase
    .from('users')
    .select('id, role, full_name')
    .eq('auth_id', user.id)
    .single()

  if (!appUser || appUser.role !== 'lawyer') {
    redirect('/staff/login')
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
      <header className="bg-slate-900 border-b-4 border-emerald-600 px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-bold">لوحة تحكم المحامي</h1>
          <p className="text-slate-300 text-xs">مرحباً {appUser.full_name} — {lawyerRow.specialization}</p>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell userId={appUser.id} />
          <EnableNotifications userId={appUser.id} />
          <ChangePassword />
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <ViewSwitcher calendarEvents={calendarEvents} casesContent={<>
        {(!cases || cases.length === 0) && (
          <div className="bg-white rounded-2xl shadow p-10 text-center text-slate-500">
            لا توجد قضايا مسندة إليك حالياً.
          </div>
        )}

        <div className="grid gap-4">
          {cases?.map((c: any) => (
            <Link
              href={`/lawyer/cases/${c.id}`}
              key={c.id}
              className="block bg-white rounded-2xl shadow p-6 border border-slate-100 hover:shadow-md hover:border-emerald-200 transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="font-bold text-lg text-slate-900">{c.title}</h2>
                  <p className="text-slate-400 text-xs mt-1">رقم القضية: {c.case_number}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadge(c.status)}`}>
                  {statusLabel(c.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                <div>
                  <span className="text-slate-400 text-xs">الموكل: </span>
                  <span className="font-bold text-slate-800">{c.clientName}</span>
                </div>
                {c.other_party && (
                  <div>
                    <span className="text-slate-400 text-xs">الطرف الآخر: </span>
                    <span className="font-bold text-slate-800">{c.other_party}</span>
                  </div>
                )}
                {c.case_type && (
                  <div>
                    <span className="text-slate-400 text-xs">نوع القضية: </span>
                    <span className="font-bold text-slate-800">{c.case_type}</span>
                  </div>
                )}
                {c.nextSessionDate && (
                  <div>
                    <span className="text-slate-400 text-xs">الجلسة القادمة: </span>
                    <span className="font-bold text-emerald-700">
                      {new Date(c.nextSessionDate).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                )}
              </div>

              {!c.primary_lawyer_id && (
                <span className="inline-block mt-3 bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-full">
                  متاحة لجميع المحامين
                </span>
              )}
            </Link>
          ))}
        </div>
      </>} />
      </main>
    </div>
  )
}
