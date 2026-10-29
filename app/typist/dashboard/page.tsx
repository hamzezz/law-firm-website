import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import LogoutButton from '@/app/staff/logout-button'
import ChangePassword from '@/app/components/change-password'

/**
 * لوحة الطبّاع.
 *
 * جداول مكتب الطباعة محميّة بلا سياسات، فلا تُقرأ من المتصفّح إطلاقاً.
 * وتُقرأ هنا بالعميل الإداري بعد التحقّق من صفة الطبّاع في الخادم.
 *
 * والطبّاع يرى الطلبات المسندة إليه وما لم يُسنَد بعد — والمكتب فيه
 * طبّاع واحد، فغير المسنَد له في واقع الأمر.
 */

const STATUS: Record<string, { label: string; cls: string }> = {
  new:      { label: 'وارد',             cls: 'bg-amber-100 text-amber-800' },
  typing:   { label: 'قيد الطباعة',      cls: 'bg-blue-100 text-blue-800' },
  review:   { label: 'بانتظار المراجعة', cls: 'bg-violet-100 text-violet-800' },
  approved: { label: 'معتمد',            cls: 'bg-emerald-100 text-emerald-800' },
  cancelled:{ label: 'ملغى',             cls: 'bg-slate-200 text-slate-600' },
}

function fmt(value: string | null) {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const day = String(d.getDate()).padStart(2, '0')
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return day + '/' + m + '/' + d.getFullYear()
}

export default async function TypistDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/portal.html')

  const { data: appUser } = await supabase
    .from('users')
    .select('id, role, full_name')
    .eq('auth_id', user.id)
    .single()

  if (!appUser || appUser.role !== 'typist') redirect('/portal.html')

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: rows } = await admin
    .from('print_requests')
    .select('id, doc_type, note, due_date, status, created_at, cases ( case_number, title, court_name )')
    .or('assigned_to.eq.' + appUser.id + ',assigned_to.is.null')
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })

  const requests = (rows || []).map((r: any) => {
    const c = Array.isArray(r.cases) ? r.cases[0] : r.cases
    return {
      id: r.id,
      docType: r.doc_type || 'مذكّرة',
      note: r.note || '',
      dueDate: r.due_date,
      status: r.status as string,
      createdAt: r.created_at,
      caseNumber: c?.case_number || '',
      caseTitle: c?.title || '',
      courtName: c?.court_name || '',
    }
  })

  const open = requests.filter((r) => r.status !== 'approved')
  const doneList = requests.filter((r) => r.status === 'approved')

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <header className="bg-slate-900 border-b-4 border-amber-500 px-4 py-4 md:px-6 md:py-5">
        <div className="max-w-4xl mx-auto flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display font-bold text-white text-base md:text-xl">مكتب الطباعة</h1>
            <p className="text-slate-300 text-[12px] md:text-sm mt-1">مرحباً {appUser.full_name}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ChangePassword />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 md:px-6 md:py-6 space-y-5">
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[12px] font-bold text-slate-500">الطلبات الجارية</span>
            <span className="text-[12px] text-slate-400">{open.length}</span>
          </div>

          {open.length === 0 && (
            <p className="text-slate-400 text-sm py-12 text-center">
              لا توجد طلبات طباعة الآن.
            </p>
          )}

          <div className="divide-y divide-slate-100">
            {open.map((r) => {
              const st = STATUS[r.status] || STATUS.new
              return (
                <div key={r.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800">{r.docType}</p>
                      <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                        {r.caseTitle}
                        {r.caseNumber ? ' — ' + r.caseNumber : ''}
                      </p>
                      {r.courtName && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{r.courtName}</p>
                      )}
                      {r.note && (
                        <p className="text-[12px] text-slate-600 mt-2 bg-slate-50 rounded-lg px-3 py-2 leading-relaxed">
                          {r.note}
                        </p>
                      )}
                    </div>
                    <span className={'shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold ' + st.cls}>
                      {st.label}
                    </span>
                  </div>

                  {r.dueDate && (
                    <p className="text-[11px] text-amber-700 mt-2">المطلوب قبل {fmt(r.dueDate)}</p>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {doneList.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <span className="text-[12px] font-bold text-slate-500">ما اعتُمد ({doneList.length})</span>
            </div>
            <div className="divide-y divide-slate-100">
              {doneList.slice(0, 10).map((r) => (
                <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700 truncate">{r.docType} — {r.caseTitle}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{r.caseNumber}</p>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                    معتمد
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
