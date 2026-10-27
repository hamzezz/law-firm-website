import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from './logout-button'
import ChangePassword from '@/app/components/change-password'
import ClientShell from './client-shell'

export default async function ClientDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/portal.html')

  /**
   * الموكّل وحسابه في استعلام واحد بدل اثنين.
   *
   * الخادم في Oregon وقاعدة البيانات في Frankfurt، فكل استعلامٍ متتابع
   * يكلّف ربع ثانية. وإن تعذّرت الضمّة لسببٍ ما رجعنا إلى المسار القديم،
   * فلا تنكسر البوابة في كل الأحوال.
   */
  let clientId: string | null = null
  let clientName = ''

  const { data: joined } = await supabase
    .from('clients')
    .select('id, users!inner ( id, full_name, auth_id )')
    .eq('users.auth_id', user.id)
    .maybeSingle()

  if (joined) {
    clientId = (joined as any).id
    const u: any = Array.isArray((joined as any).users) ? (joined as any).users[0] : (joined as any).users
    clientName = u?.full_name || ''
  } else {
    const { data: appUser } = await supabase
      .from('users').select('id, full_name').eq('auth_id', user.id).single()
    if (!appUser) {
      return <div className="min-h-screen flex items-center justify-center p-4" dir="rtl"><p className="text-slate-600">لم يتم العثور على حساب مرتبط بالمصادقة.</p></div>
    }
    clientName = appUser.full_name

    const { data: clientRow } = await supabase
      .from('clients').select('id').eq('user_id', appUser.id).single()
    if (clientRow) clientId = clientRow.id
  }

  if (!clientId) {
    return <div className="min-h-screen flex items-center justify-center p-4" dir="rtl"><p className="text-slate-600">لم يتم العثور على بيانات الموكل المرتبطة بحسابك.</p></div>
  }

  /**
   * القضايا وجلساتها في استعلام واحد.
   * كانت الجلسات استعلاماً ثانياً ينتظر معرّفات القضايا، وصارت تأتي معها.
   */
  const { data: casesRaw } = await supabase
    .from('cases')
    .select('id, case_number, title, case_type, status, court_name, opened_at, sessions ( session_date, status )')
    .eq('client_id', clientId)
    .order('opened_at', { ascending: false })

  // أقرب جلسة قادمة لكل قضية — ما لم يمرّ موعدها بعد
  const todayStr = new Date().toISOString().slice(0, 10)

  const cases = (casesRaw || []).map((c: any) => {
    const upcoming = (c.sessions || [])
      .filter((s: any) => s.status === 'scheduled' && String(s.session_date).slice(0, 10) >= todayStr)
      .map((s: any) => s.session_date)
      .sort()

    const { sessions: _ignored, ...rest } = c
    return { ...rest, nextSessionDate: upcoming[0] || null }
  })

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <ClientShell
        cases={cases}
        clientName={clientName}
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
