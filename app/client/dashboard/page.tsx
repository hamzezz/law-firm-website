import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from './logout-button'
import ChangePassword from '@/app/components/change-password'

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

export default async function ClientDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/client/login')

  const { data: appUser } = await supabase
    .from('users').select('id').eq('auth_id', user.id).single()
  if (!appUser) {
    return <div className="min-h-screen flex items-center justify-center p-4" dir="rtl"><p className="text-slate-600">لم يتم العثور على حساب مرتبط بالمصادقة.</p></div>
  }

  const { data: clientRow } = await supabase
    .from('clients').select('id').eq('user_id', appUser.id).single()
  if (!clientRow) {
    return <div className="min-h-screen flex items-center justify-center p-4" dir="rtl"><p className="text-slate-600">لم يتم العثور على بيانات الموكل المرتبطة بحسابك.</p></div>
  }

  const { data: cases } = await supabase
    .from('cases')
    .select('id, case_number, title, case_type, status, court_name, opened_at')
    .eq('client_id', clientRow.id)
    .order('opened_at', { ascending: false })

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <header className="bg-slate-900 border-b-4 border-blue-600 px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-bold">قضاياي</h1>
          <p className="text-slate-300 text-xs">متابعة سير القضايا والمحاضر</p>
        </div>
        <ChangePassword />
        <LogoutButton />
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {(!cases || cases.length === 0) && (
          <div className="bg-white rounded-2xl shadow p-10 text-center text-slate-500">
            لا توجد قضايا مسجلة حالياً.
          </div>
        )}

        <div className="grid gap-4">
          {cases?.map((c) => (
            <Link
              key={c.id}
              href={`/client/cases/${c.id}`}
              className="block bg-white rounded-2xl shadow p-6 border border-slate-100 hover:shadow-md hover:border-blue-200 transition"
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
              <div className="grid grid-cols-2 gap-3 text-sm text-slate-600 mt-4">
                {c.case_type && <div><span className="text-slate-400">نوع القضية: </span>{c.case_type}</div>}
                {c.court_name && <div><span className="text-slate-400">المحكمة: </span>{c.court_name}</div>}
                <div><span className="text-slate-400">تاريخ الفتح: </span>{new Date(c.opened_at).toLocaleDateString('ar-SA')}</div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
