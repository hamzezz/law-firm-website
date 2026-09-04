import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ManagerSessionCard from './session-card'
import CriticalDeadlines from './critical-deadlines'
import CloseCase from './close-case'

function statusBadge(status: string) {
  const s = status ? status.toLowerCase() : ''
  if (s.indexOf('active') !== -1) return 'bg-emerald-100 text-emerald-700'
  if (s.indexOf('postponed') !== -1) return 'bg-amber-100 text-amber-700'
  if (s.indexOf('closed') !== -1) return 'bg-slate-200 text-slate-600'
  return 'bg-blue-100 text-blue-700'
}

function statusLabel(status: string) {
  const map: Record<string, string> = { active: 'نشطة', postponed: 'مؤجلة', closed: 'مغلقة' }
  return map[status ? status.toLowerCase() : ''] || status
}

export default async function ManagerCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/staff/login')

  const { data: appUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_id', user.id)
    .single()

  if (!appUser || appUser.role !== 'manager') redirect('/staff/login')

  const { data: caseRow } = await supabase
    .from('cases')
    .select('id, case_number, title, case_type, status, court_name, opened_at, other_party, client_id, primary_lawyer_id')
    .eq('id', id)
    .single()

  if (!caseRow) notFound()

  let clientName = 'غير محدد'
  const { data: clientRow } = await supabase
    .from('clients')
    .select('user_id')
    .eq('id', caseRow.client_id)
    .single()
  if (clientRow) {
    const { data: clientUser } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', clientRow.user_id)
      .single()
    if (clientUser) clientName = clientUser.full_name
  }

  let lawyerName = 'الكل (غير مخصصة)'
  if (caseRow.primary_lawyer_id) {
    const { data: lawyerRow } = await supabase
      .from('lawyers')
      .select('user_id')
      .eq('id', caseRow.primary_lawyer_id)
      .single()
    if (lawyerRow) {
      const { data: lawyerUser } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', lawyerRow.user_id)
        .single()
      if (lawyerUser) lawyerName = lawyerUser.full_name
    }
  }

  const { data: deadlines } = await supabase
    .from('critical_deadlines')
    .select('id, deadline_type, description, deadline_date, is_resolved')
    .eq('case_id', id)
    .eq('is_resolved', false)
    .order('deadline_date', { ascending: true })

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
      return {
        id: d.id,
        file_name: d.file_name,
        session_id: d.session_id,
        url: signedResult.data ? signedResult.data.signedUrl : null,
      }
    })
  )

  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <header className="bg-gradient-to-l from-slate-900 to-amber-950 border-b-4 border-amber-500 px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <Link href="/manager/dashboard" className="text-amber-200 text-sm hover:text-white transition">رجوع للوحة التحكم</Link>
          <div className="flex items-start justify-between mt-4 flex-wrap gap-3">
            <div>
              <h1 className="royal-title text-2xl">{caseRow.title}</h1>
              <p className="text-amber-200 text-sm mt-1">رقم القضية: {caseRow.case_number}</p>
            </div>
            <span className={'px-4 py-1.5 rounded-full text-xs font-bold ' + statusBadge(caseRow.status)}>
              {statusLabel(caseRow.status)}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
            معلومات القضية
          </h2>
          <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
            <div>
              <p className="text-slate-400 text-xs mb-0.5">الموكل</p>
              <p className="font-bold text-slate-800">{clientName}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-0.5">المحامي المسؤول</p>
              <p className="font-bold text-slate-800">{lawyerName}</p>
            </div>
            {caseRow.other_party && (
              <div>
                <p className="text-slate-400 text-xs mb-0.5">الطرف الآخر</p>
                <p className="font-bold text-slate-800">{caseRow.other_party}</p>
              </div>
            )}
            {caseRow.case_type && (
              <div>
                <p className="text-slate-400 text-xs mb-0.5">نوع القضية</p>
                <p className="font-bold text-slate-800">{caseRow.case_type}</p>
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
        </div>
<CriticalDeadlines caseId={id} deadlines={deadlines || []} />

        <CloseCase caseId={id} currentStatus={caseRow.status} />
        <div>
          <h2 className="font-bold text-slate-900 mb-4 text-lg flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>

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
                // تُقفل البطاقة إن كانت مستقبلية، أو إن كانت جلسة سابقة لم يُسجَّل قرارها بعد
                const hasUnresolvedEarlier = (sessions || []).some(
                  (prev: any) => (prev.session_order || 0) < (s.session_order || 0) && !prev.is_locked
                )
                const isFuture = sDate > todayStr || hasUnresolvedEarlier
                return (
                  <ManagerSessionCard
                    key={s.id}
                    session={s}
                    caseId={id}
                    caseNumber={caseRow.case_number}
                    clientName={clientName}
                    uploadedBy={appUser.id}
                    sessionDocs={docsWithUrls.filter((d) => d.session_id === s.id)}
                    isFuture={isFuture}
                  />
                )
              }) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
