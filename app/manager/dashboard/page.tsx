import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/app/staff/logout-button'
import ChangePassword from '@/app/components/change-password'
import ManagerTabs from './manager-tabs'
import UploadSessions from './upload-sessions'
import UserPasswordManager from './user-password-manager'
import GlobalSearch from './global-search'
import BackupButton from './backup-button'
import AuditLog from './audit-log'
import NotificationBell from './notification-bell'
import EnableNotifications from '@/app/components/enable-notifications'

export default async function ManagerDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/staff/login')

  const { data: appUser } = await supabase
    .from('users')
    .select('id, role, full_name, username')
    .eq('auth_id', user.id)
    .single()

  if (!appUser || appUser.role !== 'manager') {
    redirect('/staff/login')
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
      <header className="bg-slate-900 border-b-4 border-amber-500 px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="royal-title text-2xl">{isTech ? 'لوحة المدير التقني' : 'لوحة تحكم المدير'}</h1>
          <p className="text-slate-300 text-xs mt-1">مرحباً {appUser.full_name}</p>
        </div>
        <div className="flex items-center gap-4">
          <a href="/manager/articles" className="text-slate-300 text-sm hover:text-white transition">إدارة المقالات</a>
          <NotificationBell userId={appUser.id} />
          <EnableNotifications userId={appUser.id} />
          <ChangePassword />
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <GlobalSearch />
        {isTech && <BackupButton />}
        <UploadSessions />
        <ManagerTabs
          calendarEvents={calendarEvents}
          auditLogs={auditLogs}
          allSessions={allSessions}
          cases={cases}
          clientsCount={clientsCount}
          lawyersCount={lawyersCount}
          allClients={allClients}
          allLawyers={allLawyers}
          yemenCourts={yemenCourts}
        />
        <UserPasswordManager accounts={manageableAccounts} />
      </main>
    </div>
  )
}
