import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { startTimer } from '@/lib/perf/timer'
import { documentLinks } from '@/lib/documents/signed-urls'
import SessionCard from './session-card'
import CriticalDeadlines from './critical-deadlines'

function statusLabel(status: string) {
  const map: Record<string, string> = { active: 'نشطة', postponed: 'مؤجلة', closed: 'مغلقة' }
  return map[(status || '').toLowerCase()] || status
}

function statusBadge(status: string) {
  const s = (status || '').toLowerCase()
  if (s.includes('active')) return 'bg-emerald-100 text-emerald-700'
  if (s.includes('postponed')) return 'bg-amber-100 text-amber-700'
  if (s.includes('closed')) return 'bg-slate-200 text-slate-700'
  return 'bg-blue-100 text-blue-700'
}

function fmt(value: string | null) {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return day + '/' + m + '/' + d.getFullYear()
}

export default async function LawyerCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const perf = startTimer('قضية المحامي')
  const { id } = await params
  const supabase = await createClient()
  perf.mark('إنشاء-العميل')
  const { data: { user } } = await supabase.auth.getUser()
  perf.mark('تحقق-الهوية')
  if (!user) redirect('/portal.html')

  /**
   * موجة واحدة لكلّ ما لا يتوقّف على غيره.
   *
   * كانت الصفحة ستّ موجات متتابعة: المستخدم، ثم المحامي، ثم القضية
   * والصلاحية، ثم البيانات، ثم اسم الموكّل. والخادم في Oregon وقاعدة
   * البيانات في Frankfurt، فكل موجة ربع ثانية إلى ثلث. وصارت ثلاثاً.
   *
   * وصلاحية الوصول تُقرأ الآن بصفوف القضية كلّها ثم تُطابق في الذاكرة،
   * فلم تعد تنتظر معرّف المحامي.
   */
  const [
    userResult,
    caseResult,
    accessResult,
    deadlinesResult,
    sessionsResult,
    documentsResult,
  ] = await Promise.all([
    supabase.from('users').select('id, role').eq('auth_id', user.id).single(),
    supabase
      .from('cases')
      .select('id, case_number, title, case_type, status, court_name, opened_at, primary_lawyer_id, client_id, clients ( users ( full_name ) )')
      .eq('id', id)
      .single(),
    supabase.from('case_lawyer_access').select('lawyer_id').eq('case_id', id),
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

  perf.mark('الموجة-الأولى')

  const appUser = userResult.data
  if (!appUser || appUser.role !== 'lawyer') redirect('/portal.html')

  const { data: lawyerRow } = await supabase
    .from('lawyers')
    .select('id')
    .eq('user_id', appUser.id)
    .single()

  perf.mark('المحامي')
  if (!lawyerRow) redirect('/lawyer/dashboard')

  const caseRow = caseResult.data
  if (!caseRow) notFound()

  const hasAccess =
    caseRow.primary_lawyer_id === lawyerRow.id ||
    caseRow.primary_lawyer_id === null ||
    (accessResult.data || []).some((r: any) => r.lawyer_id === lawyerRow.id)

  if (!hasAccess) notFound()

  const deadlines = deadlinesResult.data
  const sessionsRaw = sessionsResult.data
  const documents = documentsResult.data

  // اسم الموكّل جاء مع القضية في الاستعلام نفسه، فلا موجة ثالثة له
  const clientJoin: any = (caseRow as any).clients
  const clientUserJoin: any = clientJoin
    ? (Array.isArray(clientJoin) ? clientJoin[0]?.users : clientJoin.users)
    : null
  const clientUserRow: any = Array.isArray(clientUserJoin) ? clientUserJoin[0] : clientUserJoin
  const clientName: string = clientUserRow?.full_name || 'غير محدد'

  /**
   * الترتيب والترقيم من التاريخ لا من عمود session_order.
   * العمود كُتب تاريخياً من ثلاثة مواضع لا يعرف بعضها بعضاً، فتكرّرت أرقامه
   * واختلّ تسلسله. والتاريخ هو الحقيقة التي لا تكذب: الجلسة الثالثة زمنياً
   * هي الجلسة رقم ٣، مهما كان المخزّن في العمود.
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

  perf.end()

  const caseClosed = caseRow.status === 'closed'
  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* رأس واحد يتبدّل شكله بالعرض */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 md:static md:bg-slate-900 md:border-b-4 md:border-emerald-600 md:px-6 md:py-5">
        <div className="flex items-start gap-3 md:block">
          <Link
            href="/lawyer/dashboard#cases"
            aria-label="رجوع لقضاياي"
            className="md:hidden shrink-0 w-11 h-11 rounded-full active:scale-95 transition bg-slate-100 flex items-center justify-center text-slate-700"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[21px] h-[21px]">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>

          <Link href="/lawyer/dashboard#cases" className="hidden md:inline text-slate-300 text-sm hover:text-white transition">
            رجوع لقضاياي
          </Link>

          <div className="min-w-0 flex-1">
            <h1 className="font-display font-bold text-slate-900 text-base leading-snug md:text-white md:text-xl md:mt-2">
              {caseRow.title}
            </h1>
            <p className="text-slate-500 text-[11px] mt-1 md:text-slate-400 md:text-xs">
              {caseRow.case_number} — {clientName}
            </p>
          </div>

          <span className={'md:hidden shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold mt-0.5 ' + statusBadge(caseRow.status)}>
            {statusLabel(caseRow.status)}
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4 space-y-4 md:p-6 md:space-y-6">
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 md:p-6">
          <h2 className="font-display font-bold text-slate-900 text-sm md:text-base mb-4">معلومات القضية</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            {caseRow.case_type && (
              <div className="min-w-0">
                <span className="text-slate-400 text-[11px] block">النوع</span>
                <span className="text-slate-800 text-sm font-bold block mt-0.5 leading-snug">{caseRow.case_type}</span>
              </div>
            )}
            {caseRow.court_name && (
              <div className="min-w-0">
                <span className="text-slate-400 text-[11px] block">المحكمة</span>
                <span className="text-slate-800 text-sm font-bold block mt-0.5 leading-snug">{caseRow.court_name}</span>
              </div>
            )}
            <div className="min-w-0">
              <span className="text-slate-400 text-[11px] block">تاريخ الفتح</span>
              <span className="text-slate-800 text-sm font-bold block mt-0.5">{fmt(caseRow.opened_at)}</span>
            </div>
            <div className="min-w-0 md:hidden">
              <span className="text-slate-400 text-[11px] block">الموكل</span>
              <span className="text-slate-800 text-sm font-bold block mt-0.5 leading-snug">{clientName}</span>
            </div>
          </div>
        </section>

        <CriticalDeadlines caseId={id} deadlines={deadlines || []} caseClosed={caseClosed} />

        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-slate-900 text-sm md:text-base">الجلسات</h2>
            {sessions && sessions.length > 0 && (
              <span className="text-slate-400 text-[11px]">{sessions.length}</span>
            )}
          </div>

          {(!sessions || sessions.length === 0) && (
            <p className="text-slate-400 text-sm py-6 text-center">لا توجد جلسات مسجلة.</p>
          )}

          <div className="space-y-3">
            {sessions.map((s: any, idx: number) => {
              const sessionDateStr = new Date(s.session_date).toISOString().slice(0, 10)
              // تُقفل البطاقة إن كانت مستقبلية، أو إن كانت جلسة سابقة لم يُسجَّل قرارها بعد،
              // منعاً لتخطي الجلسات وحفظاً لتسلسل السجل
              const hasUnresolvedEarlier = sessions.slice(0, idx).some((prev: any) => !prev.is_locked)
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
                  caseClosed={caseClosed}
                />
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
