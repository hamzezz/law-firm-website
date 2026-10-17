import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from './logout-button'
import ChangePassword from '@/app/components/change-password'
import ClientShell from './client-shell'

export default async function ClientDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/portal.html')

  const { data: appUser } = await supabase
    .from('users').select('id, full_name').eq('auth_id', user.id).single()
  if (!appUser) {
    return <div className="min-h-screen flex items-center justify-center p-4" dir="rtl"><p className="text-slate-600">لم يتم العثور على حساب مرتبط بالمصادقة.</p></div>
  }

  const { data: clientRow } = await supabase
    .from('clients').select('id').eq('user_id', appUser.id).single()
  if (!clientRow) {
    return <div className="min-h-screen flex items-center justify-center p-4" dir="rtl"><p className="text-slate-600">لم يتم العثور على بيانات الموكل المرتبطة بحسابك.</p></div>
  }

  const { data: casesRaw } = await supabase
    .from('cases')
    .select('id, case_number, title, case_type, status, court_name, opened_at')
    .eq('client_id', clientRow.id)
    .order('opened_at', { ascending: false })

  // أقرب جلسة قادمة لكل قضية — ما لم يمرّ موعدها بعد
  const todayStr = new Date().toISOString().slice(0, 10)
  const caseIds = (casesRaw || []).map((c: any) => c.id)

  // كانت جلسة لكل قضية على حدة، وصارت استعلاماً واحداً للجميع
  const { data: upcomingSessions } = caseIds.length > 0
    ? await supabase
        .from('sessions')
        .select('case_id, session_date')
        .in('case_id', caseIds)
        .eq('status', 'scheduled')
        .gte('session_date', todayStr)
        .order('session_date', { ascending: true })
    : { data: [] as any[] }

  // الترتيب تصاعدي، فأول ما يُصادَف لكل قضية هو أقربها
  const nextByCase: Record<string, string> = {}
  ;(upcomingSessions || []).forEach((s: any) => {
    if (!nextByCase[s.case_id]) nextByCase[s.case_id] = s.session_date
  })

  const cases = (casesRaw || []).map((c: any) => ({
    ...c,
    nextSessionDate: nextByCase[c.id] || null,
  }))

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <ClientShell
        cases={cases}
        clientName={appUser.full_name}
        headerActions={
          <div className="contents">
            <ChangePassword />
            <LogoutButton />
          </div>
        }
        accountActions={
          <div className="contents">
            <ChangePassword className="w-full text-right text-sm font-medium text-slate-700 py-4 border-b border-slate-100" />
            <LogoutButton className="w-full text-right text-sm font-medium text-red-600 py-4" />
          </div>
        }
      />
    </div>
  )
}
