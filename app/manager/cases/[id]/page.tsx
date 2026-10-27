import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { documentLinks } from '@/lib/documents/signed-urls'
import ManagerSessionCard from './session-card'
import CriticalDeadlines from './critical-deadlines'
import CloseCase from './close-case'
import ArchiveRetry from './archive-retry'
import CaseAdmin from './case-admin'

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

/** الميلادي بأرقام إنجليزية */
function gregorian(value: string) {
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return day + '/' + month + '/' + d.getFullYear()
}

export default async function ManagerCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/portal.html')

  /**
   * موجة واحدة: هوية المدير، والقضية بأسماء موكّلها ومحاميها مضمومة،
   * ومواعيدها وجلساتها ومستنداتها.
   *
   * كانت خمس موجات متتابعة. والخادم في Oregon وقاعدة البيانات في
   * Frankfurt، فكل موجة ربع ثانية إلى ثلث.
   */
  const [userResult, caseResult, deadlinesResult, sessionsResult, documentsResult] =
    await Promise.all([
      supabase.from('users').select('id, role, username').eq('auth_id', user.id).single(),
      supabase
        .from('cases')
        .select('id, case_number, title, case_type, status, court_name, opened_at, other_party, client_id, primary_lawyer_id, clients ( users ( full_name ) ), lawyers ( users ( full_name ) )')
        .eq('id', id)
        .single(),
      supabase
        .from('critical_deadlines')
        .select('id, deadline_type, description, deadline_date, is_resolved')
        .eq('case_id', id)
        .eq('is_resolved', false)
        .order('deadline_date', { ascending: true }),
      supabase
        .from('sessions')
        .select('id, session_date, title, status, notes, next_session_date, session_order, is_locked')
        .eq('case_id', id)
        .order('session_date', { ascending: true }),
      supabase
        .from('documents')
        .select('id, file_name, session_id, storage_path, storage_provider, uploaded_at')
        .eq('case_id', id)
        .order('uploaded_at', { ascending: false }),
    ])

  const appUser = userResult.data
  if (!appUser || appUser.role !== 'manager') redirect('/portal.html')

  const caseRow = caseResult.data
  if (!caseRow) notFound()

  const deadlines = deadlinesResult.data
  const sessionsRaw = sessionsResult.data
  const documents = documentsResult.data

  /** الاسم المضموم قد يأتي كائناً أو مصفوفة بحسب العلاقة، فيُقرأ على الوجهين */
  function joinedName(rel: any): string | null {
    const row = Array.isArray(rel) ? rel[0] : rel
    if (!row) return null
    const u = Array.isArray(row.users) ? row.users[0] : row.users
    return u?.full_name || null
  }

  const clientName = joinedName((caseRow as any).clients) || 'غير محدد'
  const lawyerName = caseRow.primary_lawyer_id
    ? joinedName((caseRow as any).lawyers) || 'غير محدد'
    : 'الكل (غير مخصصة)'

  /**
   * الترتيب والترقيم من التاريخ لا من عمود session_order.
   * العمود كُتب تاريخياً من ثلاثة مواضع لا يعرف بعضها بعضاً، فتكرّرت أرقامه
   * واختلّ تسلسله. والتاريخ هو الحقيقة التي لا تكذب.
   */
  const sessions = (sessionsRaw || [])
    .slice()
    .sort((a: any, b: any) => {
      const da = String(a.session_date).slice(0, 10)
      const db = String(b.session_date).slice(0, 10)
      if (da !== db) return da < db ? -1 : 1
      return String(a.id) < String(b.id) ? -1 : 1
    })
    .map((s: any, i: number) => ({ ...s, displayOrder: i + 1 }))

  // المستندات الحيّة في Supabase، والمؤرشفة (قضايا مغلقة) على R2
  const docsWithUrls = documentLinks(documents as any)

  const caseClosed = caseRow.status === 'closed'
  const pendingArchive = caseClosed
    ? (documents || []).filter((d: any) => d.storage_provider !== 'r2').length
    : 0
  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 md:static md:bg-gradient-to-l md:from-slate-900 md:to-amber-950 md:border-b-4 md:border-amber-500 md:px-6 md:py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-start gap-3 md:block">
            <Link
              href="/manager/dashboard#clients-cases"
              aria-label="رجوع للوحة التحكم"
              className="md:hidden shrink-0 w-11 h-11 rounded-full active:scale-95 transition bg-slate-100 flex items-center justify-center text-slate-700"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[21px] h-[21px]">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </Link>

            <Link href="/manager/dashboard#clients-cases" className="hidden md:inline text-amber-200 text-sm hover:text-white transition">رجوع للوحة التحكم</Link>

            <div className="min-w-0 flex-1 md:flex md:items-start md:justify-between md:mt-4 md:flex-wrap md:gap-3">
              <div className="min-w-0">
                <h1 className="font-display font-bold text-base leading-snug text-slate-900 md:royal-title md:text-2xl">{caseRow.title}</h1>
                <p className="text-slate-500 text-[11px] mt-1 md:text-amber-200 md:text-sm">رقم القضية: {caseRow.case_number}</p>
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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
            معلومات القضية
          </h2>
          <div className="grid grid-cols-2 gap-y-4 gap-x-4 md:gap-x-6 text-sm">
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
              <p className="font-bold text-slate-800">{gregorian(caseRow.opened_at)}</p>
            </div>
          </div>
        </div>
        <CriticalDeadlines caseId={id} deadlines={deadlines || []} caseClosed={caseClosed} />

        <ArchiveRetry caseId={id} pending={pendingArchive} />

        <CloseCase caseId={id} currentStatus={caseRow.status} />
        {appUser.username === 'tech' && (
          <CaseAdmin
            caseId={id}
            caseNumber={caseRow.case_number || ''}
            initial={{
              title: caseRow.title || '',
              case_number: caseRow.case_number || '',
              court_name: caseRow.court_name || '',
              case_type: caseRow.case_type || '',
              stage: caseRow.stage || '',
              other_party: caseRow.other_party || '',
            }}
          />
        )}
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
              {sessions.map((s: any, idx: number) => {
                const sDate = new Date(s.session_date).toISOString().slice(0, 10)
                // تُقفل البطاقة إن كانت مستقبلية، أو إن كانت جلسة سابقة لم يُسجَّل قرارها بعد
                const hasUnresolvedEarlier = sessions.slice(0, idx).some((prev: any) => !prev.is_locked)
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
                  caseClosed={caseClosed}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
