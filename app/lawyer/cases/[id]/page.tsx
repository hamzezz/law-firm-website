import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SessionCard from './session-card'
import CriticalDeadlines from './critical-deadlines'

export default async function LawyerCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/staff/login')

  const { data: appUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_id', user.id)
    .single()

  if (!appUser || appUser.role !== 'lawyer') redirect('/staff/login')

  const { data: lawyerRow } = await supabase
    .from('lawyers')
    .select('id')
    .eq('user_id', appUser.id)
    .single()

  if (!lawyerRow) redirect('/lawyer/dashboard')

  const { data: caseRow } = await supabase
    .from('cases')
    .select('id, case_number, title, case_type, status, court_name, opened_at, primary_lawyer_id, client_id')
    .eq('id', id)
    .single()

  if (!caseRow) notFound()

  const { data: accessRow } = await supabase
    .from('case_lawyer_access')
    .select('id')
    .eq('case_id', id)
    .eq('lawyer_id', lawyerRow.id)
    .maybeSingle()

  const hasAccess =
    caseRow.primary_lawyer_id === lawyerRow.id ||
    caseRow.primary_lawyer_id === null ||
    !!accessRow

  if (!hasAccess) notFound()

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
      <header className="bg-slate-900 border-b-4 border-emerald-600 px-6 py-5">
        <Link href="/lawyer/dashboard" className="text-slate-300 text-sm hover:text-white transition">رجوع لقضاياي</Link>
        <h1 className="text-white text-xl font-bold mt-2">{caseRow.title}</h1>
        <p className="text-slate-400 text-xs mt-1">رقم القضية: {caseRow.case_number} - الموكل: {clientName}</p>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-2xl shadow p-6 border border-slate-100">
          <h2 className="font-bold text-slate-900 mb-3">معلومات القضية</h2>
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
            {caseRow.case_type && <div><span className="text-slate-400">النوع: </span>{caseRow.case_type}</div>}
            {caseRow.court_name && <div><span className="text-slate-400">المحكمة: </span>{caseRow.court_name}</div>}
            <div><span className="text-slate-400">تاريخ الفتح: </span>{new Date(caseRow.opened_at).toLocaleDateString('ar-SA')}</div>
          </div>
        </div>

        <CriticalDeadlines caseId={id} deadlines={deadlines || []} />

        <div className="bg-white rounded-2xl shadow p-6 border border-slate-100">
          <h2 className="font-bold text-slate-900 mb-3">الجلسات</h2>
          {(!sessions || sessions.length === 0) && <p className="text-slate-400 text-sm">لا توجد جلسات مسجلة.</p>}
          <div className="space-y-4">
            {sessions ? sessions.map((s) => {
              const sessionDateStr = new Date(s.session_date).toISOString().slice(0, 10)
              // تُقفل البطاقة إن كانت مستقبلية، أو إن كانت جلسة سابقة لم يُسجَّل قرارها بعد،
              // منعاً لتخطي الجلسات وحفظاً لتسلسل السجل
              const hasUnresolvedEarlier = (sessions || []).some(
                (prev: any) => (prev.session_order || 0) < (s.session_order || 0) && !prev.is_locked
              )
              const isFuture = sessionDateStr > todayStr || hasUnresolvedEarlier
              return (
                <SessionCard
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
      </main>
    </div>
  )
}
