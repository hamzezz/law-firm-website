'use client'

import { useState } from 'react'
import { useHashTab } from '@/app/components/use-hash-tab'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CasesTable from './cases-table'
import TeamTab from './team-tab'
import PermissionsTab from './permissions-tab'
import CalendarView from './calendar-view'
import AuditLog from './audit-log'
import ReportsPanel from './reports-panel'
import PredictiveAnalytics from './predictive-analytics'
import AccountsTab from './accounts-tab'

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#'
  let pass = ''
  for (let i = 0; i < 10; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)]
  }
  return pass
}

// تحويل أي أرقام عربية-هندية إلى إنجليزية عادية (تطبيع موحّد للمطابقة الدقيقة لاحقاً)
function normalizeDigits(text: string) {
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩'
  return text.replace(/[٠-٩]/g, function (d) {
    return String(arabicDigits.indexOf(d))
  })
}

const CASE_TYPES = ['جزائية - جسيمة', 'جزائية - غير جسيمة', 'مدنية', 'تجارية', 'شخصية']

const TABS = [
  { id: 'overview', label: 'الإحصائيات' },
  { id: 'calendar', label: '📅 التقويم' },
  { id: 'add', label: '＋ إضافة' },
  { id: 'clients-cases', label: 'القضايا الجارية' },
  { id: 'archive', label: 'الأرشيف' },
  { id: 'team', label: 'فريق العمل' },
  { id: 'permissions', label: 'الصلاحيات' },
  { id: 'accounts', label: 'إدارة الحسابات' },
]

const inputCls =
  'w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 bg-white text-sm'

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] text-slate-500 block mb-1.5">{children}</label>
}

function FormSection({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="font-display font-bold text-[13px] text-slate-700 whitespace-nowrap">{title}</span>
      <span className="flex-1 h-px bg-slate-100" />
    </div>
  )
}

function AddClientForm({ onSuccess }: { onSuccess: () => void }) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const supabase = createClient()
      const sessionResult = await supabase.auth.getSession()
      const token = sessionResult.data.session ? sessionResult.data.session.access_token : ''

      const res = await fetch('/api/manager/create-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({ fullName, phone, username, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'حدث خطأ أثناء إنشاء الموكل' })
        setLoading(false)
        return
      }

      setMessage({ type: 'success', text: 'تم إنشاء الموكل بنجاح - اسم المستخدم: ' + data.username })
      setFullName('')
      setPhone('')
      setUsername('')
      setPassword('')
      onSuccess()
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ في الاتصال بالخادم' })
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 border border-slate-200/80 space-y-4">
      <h3 className="font-display font-bold text-slate-900">إضافة موكل جديد</h3>

      {message && (
        <div className={message.type === 'success' ? 'text-sm p-3 rounded-lg bg-green-50 text-green-700' : 'text-sm p-3 rounded-lg bg-red-50 text-red-700'}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel>اسم الموكل</FieldLabel>
          <input type="text" placeholder="الاسم الرباعي" value={fullName} onChange={function (e) { setFullName(e.target.value) }} className={inputCls} required />
        </div>
        <div>
          <FieldLabel>رقم الهاتف</FieldLabel>
          <input type="text" placeholder="770000000" value={phone} onChange={function (e) { setPhone(e.target.value) }} className={inputCls} dir="ltr" />
        </div>
        <div>
          <FieldLabel>اسم المستخدم</FieldLabel>
          <input type="text" value={username} onChange={function (e) { setUsername(e.target.value) }} className={inputCls} dir="ltr" required />
        </div>
        <div>
          <FieldLabel>كلمة المرور</FieldLabel>
          <div className="flex gap-2">
            <input type="text" value={password} onChange={function (e) { setPassword(e.target.value) }} className={inputCls} dir="ltr" required />
            <button type="button" onClick={function () { setPassword(generatePassword()) }} className="shrink-0 w-12 bg-slate-100 rounded-xl hover:bg-slate-200 text-base" title="توليد كلمة مرور">🎲</button>
          </div>
        </div>
      </div>

      <button type="submit" disabled={loading} className="w-full sm:w-auto bg-amber-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-amber-600 transition disabled:opacity-50">
        {loading ? 'جارٍ الحفظ...' : 'حفظ الموكل'}
      </button>
    </form>
  )
}

function AddCaseForm({ allClients, allLawyers, yemenCourts, onSuccess }: any) {
  const [clientId, setClientId] = useState('')
  const [caseNumberInput, setCaseNumberInput] = useState('')
  const [title, setTitle] = useState('')
  const [caseType, setCaseType] = useState(CASE_TYPES[0])
  const [stage, setStage] = useState('ابتدائي')
  const [otherParty, setOtherParty] = useState('')
  const [conflictWarning, setConflictWarning] = useState('')
  const [courtName, setCourtName] = useState('')
  const [customCourtName, setCustomCourtName] = useState('')
  const [lawyerId, setLawyerId] = useState('all')
  const [extraLawyerIds, setExtraLawyerIds] = useState<string[]>([])
  const [firstSessionDate, setFirstSessionDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const supabase = createClient()
      const finalCourtName = courtName === '__custom__' ? customCourtName.trim() : courtName
      const normalizedCaseNumber = normalizeDigits(caseNumberInput.trim())

      if (!normalizedCaseNumber) {
        setMessage({ type: 'error', text: 'رقم القضية مطلوب' })
        setLoading(false)
        return
      }

      if (!finalCourtName) {
        setMessage({ type: 'error', text: 'اسم المحكمة مطلوب' })
        setLoading(false)
        return
      }

      // إضافة المحكمة تلقائياً لقائمة المحاكم لو كانت جديدة (custom)
      if (courtName === '__custom__') {
        await supabase.from('yemen_courts').insert({ name: finalCourtName }).select().maybeSingle()
      }

      // رقم القضية قد يتكرر بين المحاكم وداخل المحكمة الواحدة، فلا نمنعه.
      // نكتفي بتنبيه المستخدم ليقرّر بنفسه.
      const dupCheck = await supabase
        .from('cases')
        .select('case_number, court_name, title')
        .eq('case_number', caseNumberInput.trim())

      if (dupCheck.data && dupCheck.data.length > 0) {
        const list = dupCheck.data
          .map((c: any) => c.title + ' — ' + c.court_name)
          .join('\n')
        const go = window.confirm(
          'يوجد في النظام ' + dupCheck.data.length + ' قضية بنفس الرقم:\n\n' + list +
          '\n\nهل تريد إضافة القضية الجديدة رغم ذلك؟'
        )
        if (!go) {
          setLoading(false)
          return
        }
      }

      const { data: newCase, error } = await supabase
        .from('cases')
        .insert({
          case_number: normalizedCaseNumber,
          title,
          case_type: caseType,
          stage: stage,
          status: 'active',
          court_name: finalCourtName,
          other_party: otherParty || null,
          client_id: clientId,
          primary_lawyer_id: lawyerId === 'all' ? null : lawyerId,
        })
        .select('id')
        .single()

      if (error || !newCase) {
        setMessage({ type: 'error', text: error ? error.message : 'فشل إنشاء القضية' })
        setLoading(false)
        return
      }

      // منح المحامين المشاركين صلاحية الوصول للقضية
      if (extraLawyerIds.length > 0) {
        const accessRows = extraLawyerIds
          .filter((id) => id !== lawyerId)
          .map((id) => ({ case_id: newCase.id, lawyer_id: id, access_level: 'contributor' }))

        if (accessRows.length > 0) {
          const accessResult = await supabase.from('case_lawyer_access').insert(accessRows)
          if (accessResult.error) {
            setMessage({ type: 'error', text: 'تم إنشاء القضية لكن فشل منح صلاحيات المحامين: ' + accessResult.error.message })
            setLoading(false)
            return
          }
        }
      }

      if (firstSessionDate) {
        const sessionResult = await supabase.from('sessions').insert({
          case_id: newCase.id,
          session_date: firstSessionDate,
          title: 'الجلسة رقم 1',
          status: 'scheduled',
          session_order: 1,
        })
        if (sessionResult.error) {
          setMessage({ type: 'error', text: 'تم إنشاء القضية لكن فشل جدولة الجلسة الأولى: ' + sessionResult.error.message })
          setLoading(false)
          return
        }
      }

      setMessage({ type: 'success', text: 'تم إنشاء القضية بنجاح برقم: ' + normalizedCaseNumber })
      setTitle('')
      setOtherParty('')
      setCourtName('')
      setCustomCourtName('')
      setClientId('')
      setLawyerId('all')
      setExtraLawyerIds([])
      setFirstSessionDate('')
      setCaseNumberInput('')
      onSuccess()
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ أثناء إنشاء القضية' })
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 border border-slate-200/80 space-y-4">
      <h3 className="font-display font-bold text-slate-900">إضافة قضية جديدة لموكل موجود</h3>

      {message && (
        <div className={message.type === 'success' ? 'text-sm p-3 rounded-lg bg-green-50 text-green-700' : 'text-sm p-3 rounded-lg bg-red-50 text-red-700'}>
          {message.text}
        </div>
      )}

      <FormSection title="بيانات القضية" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel>الموكل</FieldLabel>
          <select value={clientId} onChange={function (e) { setClientId(e.target.value) }} className={inputCls} required>
            <option value="">اختر الموكل</option>
            {allClients ? allClients.map(function (c: any) {
              return <option key={c.id} value={c.id}>{c.users ? c.users.full_name : ''}</option>
            }) : null}
          </select>
        </div>

        <div>
          <FieldLabel>رقم القضية الرسمي</FieldLabel>
          <input type="text" placeholder="1446/102" value={caseNumberInput} onChange={function (e) { setCaseNumberInput(e.target.value) }} className={inputCls} required dir="ltr" />
        </div>

        <div>
          <FieldLabel>عنوان القضية</FieldLabel>
          <input type="text" placeholder="موضوع الدعوى باختصار" value={title} onChange={function (e) { setTitle(e.target.value) }} className={inputCls} required />
        </div>

        <div>
          <FieldLabel>نوع القضية</FieldLabel>
          <select value={caseType} onChange={function (e) { setCaseType(e.target.value) }} className={inputCls}>
            {CASE_TYPES.map(function (t) {
              return <option key={t} value={t}>{t}</option>
            })}
          </select>
        </div>

        <div className="sm:col-span-2">
          <FieldLabel>الطرف الآخر</FieldLabel>
          <input
            type="text"
            value={otherParty}
            onChange={function (e) { setOtherParty(e.target.value); setConflictWarning('') }}
            onBlur={async function () {
              const trimmed = otherParty.trim()
              if (trimmed.length < 3) return
              const supabase = createClient()
              const { data } = await supabase
                .from('clients')
                .select('id, users ( full_name )')
              const match = data ? data.find(function (c) {
                const name = c.users ? c.users.full_name : ''
                return name && (name.includes(trimmed) || trimmed.includes(name))
              }) : null
              if (match) {
                setConflictWarning('تنبيه: الاسم "' + trimmed + '" قريب من اسم موكل حالي لدى المكتب ("' + (match.users ? match.users.full_name : '') + '"). يرجى التحقق يدوياً من عدم وجود تعارض مصالح.')
              }
            }}
            className={inputCls}
          />
          {conflictWarning && (
            <p className="text-[11px] text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-2 leading-relaxed">⚠️ {conflictWarning}</p>
          )}
        </div>

        <div>
          <FieldLabel>المحكمة</FieldLabel>
          <select value={courtName} onChange={function (e) { setCourtName(e.target.value) }} className={inputCls} required>
            <option value="">اختر المحكمة</option>
            {yemenCourts ? yemenCourts.map(function (c: any) {
              return <option key={c.id} value={c.name}>{c.name}</option>
            }) : null}
            <option value="__custom__">محكمة أخرى (اكتبها يدوياً)</option>
          </select>
        </div>

        <div>
          <FieldLabel>المرحلة</FieldLabel>
          <select value={stage} onChange={function (e) { setStage(e.target.value) }} className={inputCls}>
            <option value="ابتدائي">ابتدائي</option>
            <option value="استئناف">استئناف</option>
            <option value="نقض">نقض</option>
          </select>
        </div>

        {courtName === '__custom__' && (
          <div className="sm:col-span-2">
            <FieldLabel>اسم المحكمة بالضبط</FieldLabel>
            <input type="text" value={customCourtName} onChange={function (e) { setCustomCourtName(e.target.value) }} className={inputCls} required />
          </div>
        )}
      </div>

      <FormSection title="المحامون والجلسة الأولى" />

      <div className="space-y-4">
        <div>
          <FieldLabel>المحامي المسؤول</FieldLabel>
          <select value={lawyerId} onChange={function (e) { setLawyerId(e.target.value) }} className={inputCls}>
            <option value="all">الكل (غير مخصصة لمحامٍ معيّن)</option>
            {allLawyers ? allLawyers.map(function (l: any) {
              return <option key={l.id} value={l.id}>{l.users ? l.users.full_name : ''}</option>
            }) : null}
          </select>
        </div>

        <div>
          <FieldLabel>محامون مشاركون (اختياري)</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {allLawyers ? allLawyers.map(function (l: any) {
              const checked = extraLawyerIds.indexOf(l.id) !== -1
              const isPrimary = lawyerId === l.id
              return (
                <button
                  type="button"
                  key={l.id}
                  disabled={isPrimary}
                  onClick={function () {
                    setExtraLawyerIds(function (prev) {
                      return prev.indexOf(l.id) !== -1
                        ? prev.filter(function (x) { return x !== l.id })
                        : prev.concat([l.id])
                    })
                  }}
                  className={
                    isPrimary
                      ? 'text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                      : checked
                        ? 'text-xs px-3 py-2.5 rounded-lg border border-amber-400 bg-amber-50 text-amber-800 font-bold'
                        : 'text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }
                >
                  {checked ? '✓ ' : ''}{l.users ? l.users.full_name : ''}
                  {isPrimary ? ' (مسؤول)' : ''}
                </button>
              )
            }) : null}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            يُمنح المحامون المختارون صلاحية الاطلاع على القضية والعمل عليها إلى جانب المحامي المسؤول.
          </p>
        </div>

        <div>
          <FieldLabel>تاريخ أول جلسة (اختياري)</FieldLabel>
          <input type="date" value={firstSessionDate} onChange={function (e) { setFirstSessionDate(e.target.value) }} className={inputCls} />
        </div>
      </div>

      <button type="submit" disabled={loading} className="w-full sm:w-auto bg-amber-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-amber-600 transition disabled:opacity-50">
        {loading ? 'جارٍ الحفظ...' : 'حفظ القضية'}
      </button>
    </form>
  )
}

/* قسم مطويّ — لتقصير تبويب الإحصائيات على الهاتف */
function Section({ id, label, open, onToggle, children }: any) {
  return (
    <div className="border-b border-slate-200">
      <button onClick={() => onToggle(id)} className="w-full flex items-center gap-3 py-4 text-right">
        <span className="font-display font-bold text-sm text-slate-800">{label}</span>
        <span className={'mr-auto text-slate-400 text-xs transition-transform ' + (open ? 'rotate-180' : '')}>▾</span>
      </button>
      {open && <div className="pb-5">{children}</div>}
    </div>
  )
}

export default function ManagerTabs({
  cases, archivedCaseIds, clientsCount, lawyersCount, allClients, allLawyers, yemenCourts,
  calendarEvents, auditLogs, allSessions, manageableAccounts, isTech,
  backupPanel, uploadPanel, accountActions,
}: any) {
  const [activeTab, setActiveTab] = useHashTab(
    ['overview', 'calendar', 'add', 'clients-cases', 'archive', 'team',
     'permissions', 'accounts', 'upload', 'backup', 'more'] as const,
    'overview'
  )
  const [open, setOpen] = useState<Record<string, boolean>>({ reports: true, predict: false, audit: false })

  const router = useRouter()

  // نحدّث بيانات الصفحة من الخادم دون إعادة تحميل، ليبقى التبويب النشط كما هو
  function handleRefresh() {
    router.refresh()
  }

  function toggle(id: string) {
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const inMore = ['more', 'permissions', 'accounts', 'upload', 'backup', 'archive'].indexOf(activeTab) !== -1

  // الأرشيف: المغلقة التي اكتملت أرشفة مستنداتها. وما عداها «جارٍ»، بما فيه
  // المغلقة التي تعثّرت أرشفتها — كي لا تختفي من بين يدي المدير.
  const archivedSet = new Set(archivedCaseIds || [])
  const archivedCases = (cases || []).filter((c: any) => archivedSet.has(c.id))
  const activeCases = (cases || []).filter((c: any) => !archivedSet.has(c.id))

  return (
    <div>
      {/* أدوات المدير التقني على الحاسوب — فوق التبويبات كما كانت */}
      {isTech && (backupPanel || uploadPanel) && (
        <div className="hidden md:block space-y-6 mb-6">
          {backupPanel}
          {uploadPanel}
        </div>
      )}

      {/* ===== تبويبات الحاسوب — كما كانت ===== */}
      <div className="hidden md:flex gap-2 mb-6 border-b border-slate-200 overflow-x-auto">
        {TABS.map(function (tab) {
          return (
            <button key={tab.id} onClick={function () { setActiveTab(tab.id) }} className={activeTab === tab.id ? 'px-5 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition border-amber-500 text-amber-600' : 'px-5 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition border-transparent text-slate-500 hover:text-slate-700'}>
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ===== عنوان الشاشة على الهاتف ===== */}
      <div className="md:hidden mb-4">
        <h2 className="font-display font-bold text-slate-900 text-lg">
          {activeTab === 'overview' && 'الإحصائيات'}
          {activeTab === 'calendar' && 'التقويم'}
          {activeTab === 'add' && 'إضافة موكل أو قضية'}
          {activeTab === 'clients-cases' && 'القضايا الجارية'}
          {activeTab === 'archive' && 'القضايا المؤرشفة'}
          {activeTab === 'team' && 'فريق العمل'}
          {activeTab === 'permissions' && 'الصلاحيات'}
          {activeTab === 'accounts' && 'إدارة الحسابات'}
          {activeTab === 'upload' && 'رفع ملف الجلسات'}
          {activeTab === 'backup' && 'النسخة الاحتياطية'}
          {activeTab === 'more' && 'المزيد'}
        </h2>
      </div>

      {/* ═══════════ الإحصائيات ═══════════ */}
      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 text-center border border-slate-200/80">
              <p className="text-2xl sm:text-3xl font-bold text-amber-600">{cases ? cases.length : 0}</p>
              <p className="text-slate-500 text-[11px] sm:text-sm mt-1">إجمالي القضايا</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 text-center border border-slate-200/80">
              <p className="text-2xl sm:text-3xl font-bold text-amber-600">{clientsCount || 0}</p>
              <p className="text-slate-500 text-[11px] sm:text-sm mt-1">إجمالي الموكلين</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 text-center border border-slate-200/80">
              <p className="text-2xl sm:text-3xl font-bold text-amber-600">{lawyersCount || 0}</p>
              <p className="text-slate-500 text-[11px] sm:text-sm mt-1">إجمالي المحامين</p>
            </div>
          </div>

          {/* على الهاتف: أقسام مطوية — وعلى الحاسوب: مفتوحة كما كانت */}
          <div className="md:hidden mt-5">
            <Section id="reports" label="التقارير" open={open.reports} onToggle={toggle}>
              <ReportsPanel cases={cases} />
            </Section>
            <Section id="predict" label="التحليلات التنبؤية" open={open.predict} onToggle={toggle}>
              <PredictiveAnalytics cases={cases} sessions={allSessions} />
            </Section>
            <Section id="audit" label="سجل النشاط والتدقيق" open={open.audit} onToggle={toggle}>
              <AuditLog logs={auditLogs} />
            </Section>
          </div>

          <div className="hidden md:block">
            <div className="mt-6"><ReportsPanel cases={cases} /></div>
            <div className="mt-6"><PredictiveAnalytics cases={cases} sessions={allSessions} /></div>
            <div className="mt-6"><AuditLog logs={auditLogs} /></div>
          </div>
        </div>
      )}

      {/* ═══════════ التقويم ═══════════ */}
      {activeTab === 'calendar' && <CalendarView events={calendarEvents || []} />}

      {/* ═══════════ إضافة موكل أو قضية ═══════════ */}
      {activeTab === 'add' && (
        <div className="space-y-5">
          <AddClientForm onSuccess={handleRefresh} />
          <AddCaseForm allClients={allClients} allLawyers={allLawyers} yemenCourts={yemenCourts} onSuccess={handleRefresh} />
        </div>
      )}

      {/* ═══════════ القضايا الجارية ═══════════ */}
      {activeTab === 'clients-cases' && (
        <div className="space-y-5">
          <div>
            <h2 className="font-display font-bold text-slate-900 mb-3 text-base sm:text-lg">
              القضايا الجارية
              <span className="text-slate-400 text-xs font-normal mr-2">{activeCases.length}</span>
            </h2>
            <CasesTable cases={activeCases} allLawyers={allLawyers} />
          </div>
        </div>
      )}

      {/* ═══════════ الأرشيف ═══════════ */}
      {activeTab === 'archive' && (
        <div className="space-y-5">
          <div>
            <h2 className="font-display font-bold text-slate-900 mb-1 text-base sm:text-lg">
              القضايا المؤرشفة
              <span className="text-slate-400 text-xs font-normal mr-2">{archivedCases.length}</span>
            </h2>
            <p className="text-slate-500 text-[11px] mb-3 leading-relaxed">
              قضايا مغلقة انتقلت مستنداتها إلى الأرشيف. والقضية المغلقة التي لم تكتمل أرشفتها
              تبقى في «القضايا الجارية» حتى تُؤرشف.
            </p>
            {archivedCases.length === 0 ? (
              <p className="text-slate-400 text-sm py-8 text-center bg-white rounded-2xl border border-slate-200/80">
                لا توجد قضايا مؤرشفة بعد.
              </p>
            ) : (
              <CasesTable cases={archivedCases} allLawyers={allLawyers} />
            )}
          </div>
        </div>
      )}

      {/* ═══════════ فريق العمل ═══════════ */}
      {activeTab === 'team' && (
        <TeamTab allLawyers={allLawyers} cases={cases} onRefresh={handleRefresh} />
      )}

      {/* ═══════════ الصلاحيات ═══════════ */}
      {activeTab === 'permissions' && (
        <PermissionsTab cases={cases} allLawyers={allLawyers} />
      )}

      {/* ═══════════ إدارة الحسابات ═══════════ */}
      {activeTab === 'accounts' && (
        <AccountsTab accounts={manageableAccounts} isTech={isTech} />
      )}

      {/* ═══════════ أدوات المدير التقني ═══════════ */}
      {activeTab === 'upload' && <div>{uploadPanel}</div>}
      {activeTab === 'backup' && <div>{backupPanel}</div>}

      {/* ═══════════ المزيد — الهاتف وحده ═══════════ */}
      {activeTab === 'more' && (
        <div className="md:hidden space-y-5">
          {isTech && (
            <div className="space-y-2.5">
              <button onClick={() => setActiveTab('upload')} className="w-full flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-right">
                <span className="text-xl">📎</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display font-bold text-sm text-slate-900">رفع ملف الجلسات</span>
                  <span className="block text-[11px] text-slate-600 mt-0.5 leading-relaxed">قراءة كشف المحكمة ومطابقته مع قضايا المكتب</span>
                </span>
                <span className="text-amber-700">‹</span>
              </button>

              <button onClick={() => setActiveTab('backup')} className="w-full flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-right">
                <span className="text-xl">💾</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display font-bold text-sm text-slate-900">النسخة الاحتياطية</span>
                  <span className="block text-[11px] text-slate-600 mt-0.5 leading-relaxed">تنزيل نسخة كاملة من بيانات النظام</span>
                </span>
                <span className="text-amber-700">‹</span>
              </button>
            </div>
          )}

          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-display font-bold text-[13px] text-slate-600">الإدارة</span>
              <span className="flex-1 h-px bg-slate-200" />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/80 px-4 shadow-sm">
              <button onClick={() => setActiveTab('archive')} className="w-full flex items-center py-4 border-b border-slate-100 text-right">
                <span className="text-sm font-medium text-slate-700">القضايا المؤرشفة</span>
                <span className="mr-auto text-slate-300">‹</span>
              </button>
              <button onClick={() => setActiveTab('permissions')} className="w-full flex items-center py-4 border-b border-slate-100 text-right">
                <span className="text-sm font-medium text-slate-700">الصلاحيات</span>
                <span className="mr-auto text-slate-300">‹</span>
              </button>
              <button onClick={() => setActiveTab('accounts')} className="w-full flex items-center py-4 border-b border-slate-100 text-right">
                <span className="text-sm font-medium text-slate-700">إدارة الحسابات</span>
                <span className="mr-auto text-slate-300">‹</span>
              </button>
              <a href="/manager/articles" className="w-full flex items-center py-4 border-b border-slate-100 text-right">
                <span className="text-sm font-medium text-slate-700">إدارة المقالات</span>
                <span className="mr-auto text-slate-300">‹</span>
              </a>
              <a href="/manager/cards" className="w-full flex items-center py-4 text-right">
                <span className="text-sm font-medium text-slate-700">بطاقات المنشورات</span>
                <span className="mr-auto text-slate-300">‹</span>
              </a>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-display font-bold text-[13px] text-slate-600">حسابي</span>
              <span className="flex-1 h-px bg-slate-200" />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/80 px-4 shadow-sm">
              {accountActions}
            </div>
          </div>
        </div>
      )}

      {/* ===== الشريط السفلي — الهاتف وحده ===== */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-[60] bg-white border-t border-slate-200 flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {[
          { k: 'overview', label: 'إحصاء', on: activeTab === 'overview' },
          { k: 'add', label: 'إضافة', on: activeTab === 'add' },
          { k: 'clients-cases', label: 'القضايا', on: activeTab === 'clients-cases' },
          { k: 'calendar', label: 'التقويم', on: activeTab === 'calendar' },
          { k: 'team', label: 'الفريق', on: activeTab === 'team' },
          { k: 'more', label: 'المزيد', on: inMore },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setActiveTab(t.k)}
            className={
              'flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[9px] transition ' +
              (t.on ? 'text-amber-600 font-bold' : 'text-slate-400')
            }
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={t.on ? 2 : 1.7} strokeLinecap="round" strokeLinejoin="round" className="w-[19px] h-[19px]">
              {t.k === 'overview' && <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />}
              {t.k === 'add' && <><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>}
              {t.k === 'clients-cases' && <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />}
              {t.k === 'archive' && <><rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4" /></>}
              {t.k === 'calendar' && <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>}
              {t.k === 'team' && <><circle cx="9" cy="8" r="3.5" /><path d="M2 20c0-3.5 3.1-5.5 7-5.5s7 2 7 5.5M17 8.5a3 3 0 0 1 0 5M18 14.5c2.4.5 4 2.2 4 4.5" /></>}
              {t.k === 'more' && <><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></>}
            </svg>
            <span className="truncate max-w-full px-0.5">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
