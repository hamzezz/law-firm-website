import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from './logout-button'
import ChangePassword from '@/app/components/change-password'
import ClientShell from './client-shell'

export default async function ClientDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/client/login')

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
  const cases = await Promise.all(
    (casesRaw || []).map(async (c: any) => {
      const { data: nextSession } = await supabase
        .from('sessions')
        .select('session_date')
        .eq('case_id', c.id)
        .eq('status', 'scheduled')
        .gte('session_date', todayStr)
        .order('session_date', { ascending: true })
        .limit(1)
        .maybeSingle()

      return { ...c, nextSessionDate: nextSession?.session_date || null }
    })
  )

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
