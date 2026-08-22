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

export default async function ClientCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/client/login')

  const { data: appUser } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single()
  if (!appUser) redirect('/client/login')

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

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, session_date, title, status, notes, next_session_date, session_order, is_locked')
    .eq('case_id', id)
    .order('session_order', { ascending: true })

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
      <header className="bg-gradient-to-l from-slate-900 to-blue-950 border-b-4 border-blue-600 px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <Link href="/client/dashboard" className="text-blue-200 text-sm hover:text-white transition inline-flex items-center gap-1">
            <span>رجوع لقضاياي</span>
          </Link>
          <div className="flex items-start justify-between mt-4 flex-wrap gap-3">
            <div>
              <h1 className="text-white text-2xl font-bold">{caseRow.title}</h1>
              <p className="text-blue-200 text-sm mt-1">رقم القضية: {caseRow.case_number}</p>
            </div>
            <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${statusBadge(caseRow.status)}`}>
              {statusLabel(caseRow.status)}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
            معلومات القضية
          </h2>
          <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
            {caseRow.case_type && (
              <div>
                <p className="text-slate-400 text-xs mb-0.5">نوع القضية</p>
                <p className="font-bold text-slate-800">{caseRow.case_type}</p>
              </div>
            )}
            {caseRow.other_party && (
              <div>
                <p className="text-slate-400 text-xs mb-0.5">الطرف الآخر</p>
                <p className="font-bold text-slate-800">{caseRow.other_party}</p>
              </div>
            )}
            {caseRow.court_name && (
              <div>
                <p className="text-slate-400 text-xs mb-0.5">المحكمة</p>
                <p className="font-bold text-slate-800">{caseRow.court_name}</p>
              </div>
            )}
            <div>
              <p className="text-slate-400 text-xs mb-0.5">تاريخ الفتح</p>
              <p className="font-bold text-slate-800">{new Date(caseRow.opened_at).toLocaleDateString('ar-SA')}</p>
            </div>
          </div>

          {nextUpcoming && (
            <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-xl">📅</span>
              <div>
                <p className="text-xs text-blue-600 font-bold">الجلسة القادمة</p>
                <p className="text-sm text-blue-900 font-bold">
                  {new Date(nextUpcoming.session_date).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 className="font-bold text-slate-900 mb-4 text-lg flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
            سير الجلسات
          </h2>

          {(!sessions || sessions.length === 0) && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center text-slate-400 text-sm">
              لا توجد جلسات مسجلة لهذه القضية حتى الآن.
            </div>
          )}

          <div className="relative">
            {sessions && sessions.length > 0 && (
              <div className="absolute right-[15px] top-2 bottom-2 w-0.5 bg-slate-200"></div>
            )}

            <div className="space-y-5">
              {sessions ? sessions.map((s) => {
                const sDate = new Date(s.session_date).toISOString().slice(0, 10)
                const isFuture = sDate > todayStr
                const sessionDocs = docsWithUrls.filter((d) => d.session_id === s.id)

                return (
                  <div key={s.id} className="relative pr-10">
                    <div
                      className={
                        isFuture
                          ? 'absolute right-0 top-1.5 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow bg-slate-200 text-slate-400'
                          : s.is_locked
                          ? 'absolute right-0 top-1.5 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow bg-blue-600 text-white'
                          : 'absolute right-0 top-1.5 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow bg-amber-400 text-white'
                      }
                    >
                      {isFuture ? '🔒' : s.session_order}
                    </div>

                    {isFuture ? (
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 opacity-70">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-bold text-sm text-slate-500">الجلسة رقم {s.session_order}</h3>
                          <span className="text-[11px] text-slate-400">{sessionStatusLabel(s.status)}</span>
                        </div>
                        <p className="text-xs text-slate-400">
                          موعدها {new Date(s.session_date).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} — لم تنعقد بعد
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-slate-900">الجلسة رقم {s.session_order}</h3>
                          <span className="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                            {sessionStatusLabel(s.status)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mb-3">
                          {new Date(s.session_date).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>

                        {s.notes ? (
                          <div className="bg-slate-50 rounded-xl p-3 mb-3">
                            <p className="text-xs text-slate-400 mb-1 font-bold">قرار الجلسة</p>
                            <p className="text-sm text-slate-700 leading-relaxed">{s.notes}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic mb-3">لم يُدرج قرار لهذه الجلسة بعد.</p>
                        )}

                        {s.next_session_date && (
                          <p className="text-xs text-blue-700 font-bold mb-3">
                            الجلسة القادمة: {new Date(s.next_session_date).toLocaleDateString('ar-SA')}
                          </p>
                        )}

                        {sessionDocs.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-slate-100">
                            <p className="text-xs text-slate-400 font-bold mb-1">المحاضر المرفقة</p>
                            {sessionDocs.map((d) => {
                              const docUrl = d.url ? d.url : '#'
                              return (
                                <a key={d.id} href={docUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-blue-700 hover:text-blue-900 hover:underline transition">
                                  <span>📄</span>
                                  <span>{d.file_name}</span>
                                </a>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              }) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
