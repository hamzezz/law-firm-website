import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { startTimer } from '@/lib/perf/timer'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import LogoutButton from '@/app/staff/logout-button'
import ChangePassword from '@/app/components/change-password'
import ManagerTabs from './manager-tabs'
import UploadSessions from './upload-sessions'
import GlobalSearch from './global-search'
import BackupButton from './backup-button'
import PushTest from './push-test'
import DeliveryStatus from './delivery-status'
import NotificationBell from './notification-bell'
import EnableNotifications from '@/app/components/enable-notifications'
import RegisterDeviceToken from '@/app/components/register-device-token'

export default async function ManagerDashboardPage() {
  const perf = startTimer('لوحة المدير')
  const supabase = await createClient()
  perf.mark('إنشاء-العميل')
  const { data: { user } } = await supabase.auth.getUser()
  perf.mark('تحقق-الهوية')
  if (!user) redirect('/portal.html')

  const { data: appUser } = await supabase
    .from('users')
    .select('id, role, full_name, username')
    .eq('auth_id', user.id)
    .single()

  if (!appUser || appUser.role !== 'manager') {
    redirect('/portal.html')
  }

  perf.mark('المستخدم')
  const isTech = appUser.username === 'tech'

  // tech يدير الجميع (بما فيهم المدراء)، أي مدير آخر يدير فقط المحامين والموكلين
  const managedRoles = isTech ? ['lawyer', 'client', 'manager'] : ['lawyer', 'client']

  /**
   * حالة وصول الإشعارات — للتقني وحده.
   * تُقرأ بصلاحية الخادم عمداً: سياسة RLS تحصر كل مستخدم بإشعاراته،
   * وهذه الشاشة تعرض إشعارات الفريق كلّه لتشخيص ما لا يصل.
   */
  const admin = isTech
    ? createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
    : null

  /**
   * الموجة الأولى: كل استعلام لا يتوقّف على نتيجة غيره.
   *
   * كانت هذه أحد عشر استعلاماً متتابعاً، ينتظر كلٌّ منها الذي قبله بلا سبب.
   * والخادم في Oregon وقاعدة البيانات في Frankfurt، فكل انتظار يكلّف
   * ربع ثانية إلى ثلث. فصار الانتظار واحداً لا أحد عشر.
   */
  const [
    casesResult,
    clientsResult,
    lawyersResult,
    auditResult,
    sessionsResult,
    deadlinesResult,
    courtsResult,
    clientsCountResult,
    lawyersCountResult,
    accountsResult,
    notifResult,
  ] = await Promise.all([
    supabase
      .from('cases')
      .select('id, case_number, title, case_type, status, stage, court_name, opened_at, other_party, clients ( id, national_id, users ( full_name ) ), lawyers ( id, users ( full_name ) )')
      .order('opened_at', { ascending: false }),
    supabase.from('clients').select('id, users ( full_name )'),
    supabase.from('lawyers').select('id, user_id, users ( full_name )'),
    supabase
      .from('audit_log')
      .select('id, action, metadata, created_at, users ( full_name )')
      .order('created_at', { ascending: false })
      .limit(80),
    supabase
      .from('sessions')
      .select('id, session_date, title, case_id, cases ( title, case_number )'),
    supabase
      .from('critical_deadlines')
      .select('id, deadline_type, deadline_date, case_id, cases ( title, case_number )')
      .eq('is_resolved', false),
    supabase.from('yemen_courts').select('id, name').order('name', { ascending: true }),
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('lawyers').select('*', { count: 'exact', head: true }),
    supabase
      .from('users')
      .select('id, full_name, username, role')
      .in('role', managedRoles)
      .order('role', { ascending: true }),
    admin
      ? admin
          .from('notifications')
          .select('id, title, created_at, delivered_at, is_read, recipient_user_id')
          .order('created_at', { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] as any[] }),
  ])

  perf.mark('الموجة-الأولى')

  const cases = casesResult.data
  const allClients = clientsResult.data
  const allLawyers = lawyersResult.data
  const auditLogs = auditResult.data
  const allSessions = sessionsResult.data
  const allDeadlines = deadlinesResult.data
  const yemenCourts = courtsResult.data
  const clientsCount = clientsCountResult.count
  const lawyersCount = lawyersCountResult.count
  const notifRows = notifResult.data || []

  /**
   * القضايا المؤرشفة: المغلقة التي انتقلت كل مستنداتها إلى R2 فعلاً.
   * والقضية المغلقة التي تعثّرت أرشفتها تبقى في «القضايا» لا في «الأرشيف»،
   * كي لا تختفي من بين يدي المدير وهي تنتظر إجراءً.
   */
  const closedCaseIds = (cases || [])
    .filter((c: any) => c.status === 'closed')
    .map((c: any) => c.id)

  /** الموجة الثانية: ما لا يُعرف إلا بعد الأولى */
  const missingNameIds = Array.from(
    new Set(notifRows.map((n: any) => n.recipient_user_id).filter(Boolean))
  )

  const [closedDocsResult, recipientsResult] = await Promise.all([
    closedCaseIds.length > 0
      ? supabase.from('documents').select('case_id, storage_provider').in('case_id', closedCaseIds)
      : Promise.resolve({ data: [] as any[] }),
    admin && missingNameIds.length > 0
      ? admin.from('users').select('id, full_name').in('id', missingNameIds)
      : Promise.resolve({ data: [] as any[] }),
  ])

  perf.mark('الموجة-الثانية')

  const pendingByCase: Record<string, number> = {}
  ;(closedDocsResult.data || []).forEach((d: any) => {
    if (d.storage_provider !== 'r2') {
      pendingByCase[d.case_id] = (pendingByCase[d.case_id] || 0) + 1
    }
  })

  const archivedCaseIds = closedCaseIds.filter((id: string) => !pendingByCase[id])

  const nameById: Record<string, string> = {}
  ;(recipientsResult.data || []).forEach((u: any) => { nameById[u.id] = u.full_name })

  const deliveryRows = notifRows.map((n: any) => {
    const joined = Array.isArray(n.users) ? n.users[0] : n.users
    return {
      ...n,
      recipientName: joined?.full_name || nameById[n.recipient_user_id] || 'مستخدم',
    }
  })

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

  // استبعاد حساب tech نفسه من القائمة حتى بلوحة tech (لا يغيّر كلمة مروره من هنا، بل من زر "تغيير كلمة المرور" الذاتي)
  const manageableAccounts = (accountsResult.data || []).filter((a: any) => a.username !== 'tech')

  perf.mark('التجميع')
  perf.end()

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* رأس واحد يتبدّل شكله بالعرض */}
      <header className="sticky top-0 z-20 flex items-start gap-3 px-4 py-3 bg-white border-b border-slate-200 md:static md:items-center md:justify-between md:gap-4 md:px-6 md:py-5 md:bg-slate-900 md:border-b-4 md:border-amber-500">
        <span className="w-1 self-stretch rounded bg-amber-500 shrink-0 md:hidden" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display font-bold text-base leading-tight text-slate-900 md:royal-title md:text-2xl">
            {isTech ? 'لوحة التقني' : 'لوحة تحكم المدير'}
          </h1>
          <p className="text-[11px] mt-1 truncate text-slate-500 md:text-slate-300 md:text-xs">
            مرحباً {appUser.full_name}
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-4 [&_button]:text-slate-600 md:[&_button]:text-white">
          <NotificationBell userId={appUser.id} />
          <span className="hidden md:flex items-center gap-4">
            <a href="/manager/articles" className="text-slate-300 text-sm hover:text-white transition">إدارة المقالات</a>
            <a href="/manager/cards" className="text-slate-300 text-sm hover:text-white transition">بطاقات المنشورات</a>
            <EnableNotifications userId={appUser.id} />
            <ChangePassword />
            <LogoutButton />
          </span>
        </div>
      </header>

      <RegisterDeviceToken />

      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4 pb-28 md:p-6 md:space-y-6 md:pb-10">
        <GlobalSearch cases={cases} />

        <ManagerTabs
          calendarEvents={calendarEvents}
          auditLogs={auditLogs}
          allSessions={allSessions}
          manageableAccounts={manageableAccounts}
          isTech={isTech}
          cases={cases}
          archivedCaseIds={archivedCaseIds}
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
                <DeliveryStatus rows={deliveryRows} />
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
