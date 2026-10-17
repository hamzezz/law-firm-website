import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/app/staff/logout-button'
import ChangePassword from '@/app/components/change-password'
import ManagerTabs from './manager-tabs'
import UploadSessions from './upload-sessions'
import GlobalSearch from './global-search'
import BackupButton from './backup-button'
import PushTest from './push-test'
import NotificationBell from './notification-bell'
import EnableNotifications from '@/app/components/enable-notifications'
import RegisterDeviceToken from '@/app/components/register-device-token'

export default async function ManagerDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/portal.html')

  const { data: appUser } = await supabase
    .from('users')
    .select('id, role, full_name, username')
    .eq('auth_id', user.id)
    .single()

  if (!appUser || appUser.role !== 'manager') {
    redirect('/portal.html')
  }

  const isTech = appUser.username === 'tech'

  const { data: cases } = await supabase
    .from('cases')
    .select('id, case_number, title, case_type, status, stage, court_name, opened_at, clients ( id, national_id, users ( full_name ) ), lawyers ( id, users ( full_name ) )')
    .order('opened_at', { ascending: false })

  const { data: allClients } = await supabase
    .from('clients')
    .select('id, users ( full_name )')

  const { data: allLawyers } = await supabase
    .from('lawyers')
    .select('id, user_id, users ( full_name )')

  const { data: auditLogs } = await supabase
    .from('audit_log')
    .select('id, action, metadata, created_at, users ( full_name )')
    .order('created_at', { ascending: false })
    .limit(20)

  const { data: allSessions } = await supabase
    .from('sessions')
    .select('id, session_date, title, case_id, cases ( title, case_number )')

  const { data: allDeadlines } = await supabase
    .from('critical_deadlines')
    .select('id, deadline_type, deadline_date, case_id, cases ( title, case_number )')
    .eq('is_resolved', false)

  const calendarEvents = [
    ...(allSessions || []).map((s) => ({
      date: new Date(s.session_date).toISOString().slice(0, 10),
      title: (s.cases ? s.cases.title : s.title) + ' - جلسة',
      caseId: s.case_id,
      type: 'session',
    })),
    ...(allDeadlines || []).map((d) => ({
      date: d.deadline_date,
      title: (d.cases ? d.cases.title : '') + ' - ' + d.deadline_type,
      caseId: d.case_id,
      type: 'deadline',
    })),
  ]

  const { data: yemenCourts } = await supabase
    .from('yemen_courts')
    .select('id, name')
    .order('name', { ascending: true })

  const { count: clientsCount } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })

  const { count: lawyersCount } = await supabase
    .from('lawyers')
    .select('*', { count: 'exact', head: true })

  // tech يدير الجميع (بما فيهم المدراء)، أي مدير آخر يدير فقط المحامين والموكلين
  const managedRoles = isTech ? ['lawyer', 'client', 'manager'] : ['lawyer', 'client']

  const { data: manageableAccountsRaw } = await supabase
    .from('users')
    .select('id, full_name, username, role')
    .in('role', managedRoles)
    .order('role', { ascending: true })

  // استبعاد حساب tech نفسه من القائمة حتى بلوحة tech (لا يغيّر كلمة مروره من هنا، بل من زر "تغيير كلمة المرور" الذاتي)
  const manageableAccounts = manageableAccountsRaw
    ? manageableAccountsRaw.filter((a) => a.username !== 'tech')
    : []

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* رأس واحد يتبدّل شكله بالعرض */}
      <header className="sticky top-0 z-20 flex items-start gap-3 px-4 py-3 bg-white border-b border-slate-200 md:static md:items-center md:justify-between md:gap-4 md:px-6 md:py-5 md:bg-slate-900 md:border-b-4 md:border-amber-500">
        <span className="w-1 self-stretch rounded bg-amber-500 shrink-0 md:hidden" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display font-bold text-base leading-tight text-slate-900 md:royal-title md:text-2xl">
            {isTech ? 'لوحة المدير التقني' : 'لوحة تحكم المدير'}
          </h1>
          <p className="text-[11px] mt-1 truncate text-slate-500 md:text-slate-300 md:text-xs">
            مرحباً {appUser.full_name}
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-4 [&_button]:text-slate-600 md:[&_button]:text-white">
          <NotificationBell userId={appUser.id} />
          <span className="hidden md:flex items-center gap-4">
            <a href="/manager/articles" className="text-slate-300 text-sm hover:text-white transition">إدارة المقالات</a>
            <EnableNotifications userId={appUser.id} />
            <ChangePassword />
            <LogoutButton />
          </span>
        </div>
      </header>

      <RegisterDeviceToken />

      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4 pb-28 md:p-6 md:space-y-6 md:pb-10">
        <GlobalSearch />

        <ManagerTabs
          calendarEvents={calendarEvents}
          auditLogs={auditLogs}
          allSessions={allSessions}
          manageableAccounts={manageableAccounts}
          isTech={isTech}
          cases={cases}
          clientsCount={clientsCount}
          lawyersCount={lawyersCount}
          allClients={allClients}
          allLawyers={allLawyers}
          yemenCourts={yemenCourts}
          backupPanel={
            isTech ? (
              <div className="space-y-4">
                <BackupButton />
                <PushTest />
              </div>
            ) : null
          }
          uploadPanel={isTech ? <UploadSessions /> : null}
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
      </main>
    </div>
  )
}
