import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function statusBadge(status: string) {
  const s = status?.toLowerCase() || ''
  if (s.includes('active')) return 'bg-emerald-100 text-emerald-700'
  if (s.includes('postponed')) return 'bg-amber-100 text-amber-700'
  if (s.includes('closed')) return 'bg-slate-200 text-slate-600'
  return 'bg-blue-100 text-blue-700'
}

function statusLabel(status: string) {
  const map: Record<string, string> = { active: 'نشطة', postponed: 'مؤجلة', closed: 'مغلقة' }
  return map[status?.toLowerCase()] || status
}

function sessionStatusLabel(status: string) {
  const map: Record<string, string> = { scheduled: 'مجدولة', held: 'منعقدة', postponed: 'مؤجلة' }
  return map[status?.toLowerCase()] || status
}

/** الميلادي بأرقام إنجليزية: 25/10/2026 */
function gregorian(value: string) {
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return day + '/' + month + '/' + d.getFullYear()
}

/** الهجري بتقويم أم القرى صراحةً — لئلّا يختلف الخادم عن المتصفّح */
function hijriLong(d: Date) {
  try {
    return d.toLocaleDateString('ar-SA-u-ca-islamic-umalqura', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch {
    return ''
  }
}

/** الهجري الطويل كما تستعمله المحاكم، ثم الميلادي بجانبه */
function bothCalendars(value: string) {
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const hijri = hijriLong(d)
  return hijri ? hijri + ' — ' + gregorian(value) : gregorian(value)
}

export default async function ClientCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/portal.html')

  const { data: appUser } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single()
  if (!appUser) redirect('/portal.html')

  const { data: clientRow } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', appUser.id)
    .single()
  if (!clientRow) redirect('/client/dashboard')

  const { data: caseRow } = await supabase
    .from('cases')
    .select('id, case_number, title, case_type, status, court_name, opened_at, other_party, client_id')
    .eq('id', id)
    .single()

  if (!caseRow || caseRow.client_id !== clientRow.id) notFound()

  const { data: sessionsRaw } = await supabase
    .from('sessions')
    .select('id, session_date, title, status, notes, next_session_date, session_order, is_locked')
    .eq('case_id', id)
    .order('session_date', { ascending: true })

  /** الترتيب والترقيم من التاريخ لا من عمود session_order (انظر صفحة المحامي) */
  const sessions = (sessionsRaw || [])
    .slice()
    .sort((a: any, b: any) => {
      const da = String(a.session_date).slice(0, 10)
      const db = String(b.session_date).slice(0, 10)
      if (da !== db) return da < db ? -1 : 1
      return String(a.id) < String(b.id) ? -1 : 1
    })
    .map((s: any, i: number) => ({ ...s, displayOrder: i + 1 }))

  const { data: documents } = await supabase
    .from('documents')
    .select('id, file_name, session_id, storage_path, uploaded_at')
    .eq('case_id', id)
    .order('uploaded_at', { ascending: false })

  const docsWithUrls = await Promise.all(
    (documents || []).map(async (d) => {
      const signedResult = await supabase.storage
        .from('case-documents')
        .createSignedUrl(d.storage_path, 3600)
      return { id: d.id, file_name: d.file_name, session_id: d.session_id, url: signedResult.data ? signedResult.data.signedUrl : null }
    })
  )

  const todayStr = new Date().toISOString().slice(0, 10)
  const nextUpcoming = sessions ? sessions.find((s) => {
    const sDate = new Date(s.session_date).toISOString().slice(0, 10)
    return sDate >= todayStr && s.status === 'scheduled'
  }) : null

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* رأس واحد يتبدّل شكله بالعرض */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 md:static md:bg-gradient-to-l md:from-slate-900 md:to-blue-950 md:border-b-4 md:border-blue-600 md:px-6 md:py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-start gap-3 md:block">
            <Link
              href="/client/dashboard"
              aria-label="رجوع لقضاياي"
              className="md:hidden shrink-0 w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </Link>

            <Link href="/client/dashboard" className="hidden md:inline-flex text-blue-200 text-sm hover:text-white transition items-center gap-1">
              <span>رجوع لقضاياي</span>
            </Link>

            <div className="min-w-0 flex-1 md:flex md:items-start md:justify-between md:mt-4 md:flex-wrap md:gap-3">
              <div className="min-w-0">
                <h1 className="font-display font-bold text-base leading-snug text-slate-900 md:text-white md:text-2xl">
                  {caseRow.title}
                </h1>
                <p className="text-slate-500 text-[11px] mt-1 md:text-blue-200 md:text-sm">
                  رقم القضية: {caseRow.case_number}
                </p>
              </div>
              <span className={'hidden md:inline-block px-4 py-1.5 rounded-full text-xs font-bold ' + statusBadge(caseRow.status)}>
                {statusLabel(caseRow.status)}
              </span>
            </div>

            <span className={'md:hidden shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold mt-0.5 ' + statusBadge(caseRow.status)}>
              {statusLabel(caseRow.status)}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 space-y-4 md:p-6 md:space-y-6">
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
            <h2 className="font-display font-bold text-slate-900 text-sm md:text-base">معلومات القضية</h2>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            {caseRow.case_type && (
              <div className="min-w-0">
                <p className="text-slate-400 text-[11px]">نوع القضية</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5 leading-snug">{caseRow.case_type}</p>
              </div>
            )}
            {caseRow.other_party && (
              <div className="min-w-0">
                <p className="text-slate-400 text-[11px]">الطرف الآخر</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5 leading-snug">{caseRow.other_party}</p>
              </div>
            )}
            {caseRow.court_name && (
              <div className="min-w-0">
                <p className="text-slate-400 text-[11px]">المحكمة</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5 leading-snug">{caseRow.court_name}</p>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-slate-400 text-[11px]">تاريخ الفتح</p>
              <p className="font-bold text-slate-800 text-sm mt-0.5">{gregorian(caseRow.opened_at)}</p>
            </div>
          </div>

          {nextUpcoming && (
            <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-[11px] text-blue-600 font-bold">الجلسة القادمة</p>
              <p className="text-sm text-blue-900 font-bold mt-1 leading-relaxed">
                {bothCalendars(nextUpcoming.session_date)}
              </p>
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
            <h2 className="font-display font-bold text-slate-900 text-sm md:text-lg">سير الجلسات</h2>
          </div>

          {(!sessions || sessions.length === 0) && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-10 text-center text-slate-400 text-sm">
              لا توجد جلسات مسجلة لهذه القضية حتى الآن.
            </div>
          )}

          <div className="relative">
            {sessions && sessions.length > 0 && (
              <div className="absolute right-[15px] top-3 bottom-3 w-0.5 bg-slate-200" />
            )}

            <div className="space-y-3 md:space-y-5">
              {sessions.map((s: any) => {
                const sDate = new Date(s.session_date).toISOString().slice(0, 10)
                const isFuture = sDate > todayStr
                const sessionDocs = docsWithUrls.filter((d) => d.session_id === s.id)

                return (
                  <div key={s.id} className="relative pr-10">
                    <div
                      className={
                        'absolute right-0 top-3 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow ' +
                        (isFuture
                          ? 'bg-slate-200 text-slate-400'
                          : s.is_locked
                            ? 'bg-blue-600 text-white'
                            : 'bg-amber-400 text-white')
                      }
                    >
                      {isFuture ? '🔒' : s.displayOrder}
                    </div>

                    {isFuture ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-bold text-sm text-slate-500">الجلسة رقم {s.displayOrder}</h3>
                          <span className="text-[11px] text-slate-400 shrink-0">{sessionStatusLabel(s.status)}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          موعدها {bothCalendars(s.session_date)} — لم تنعقد بعد
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-4 md:rounded-2xl md:p-5">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-display font-bold text-slate-900 text-sm">الجلسة رقم {s.displayOrder}</h3>
                          <span className="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold shrink-0">
                            {sessionStatusLabel(s.status)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">{bothCalendars(s.session_date)}</p>

                        {s.notes ? (
                          <div className="bg-slate-50 rounded-xl p-3 mb-3">
                            <p className="text-[11px] text-slate-400 mb-1 font-bold">قرار الجلسة</p>
                            <p className="text-sm text-slate-700 leading-relaxed">{s.notes}</p>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic mb-3">لم يُدرج قرار لهذه الجلسة بعد.</p>
                        )}

                        {s.next_session_date && (
                          <p className="text-[11px] text-blue-700 font-bold mb-3">
                            الجلسة القادمة: {gregorian(s.next_session_date)}
                          </p>
                        )}

                        {sessionDocs.length > 0 && (
                          <div className="pt-3 border-t border-slate-100 space-y-2">
                            <p className="text-[11px] text-slate-400 font-bold">المحاضر المرفقة</p>
                            {sessionDocs.map((d) => {
                              const docUrl = d.url ? d.url : '#'
                              return (
                                <a
                                  key={d.id}
                                  href={docUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2.5 text-xs text-blue-700 hover:text-blue-900 py-1.5 transition"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-4 h-4 shrink-0">
                                    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                                    <path d="M14 3v5h5" />
                                  </svg>
                                  <span className="truncate">{d.file_name}</span>
                                </a>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
