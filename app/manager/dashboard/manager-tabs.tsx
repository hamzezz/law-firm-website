'use client'

import { useState } from 'react'
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
  { id: 'clients-cases', label: 'الموكلون والقضايا' },
  { id: 'team', label: 'فريق العمل' },
  { id: 'permissions', label: 'الصلاحيات' },
  { id: 'accounts', label: 'إدارة الحسابات' },
]

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
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-6 border border-slate-100 space-y-4">
      <h3 className="font-bold text-slate-900 mb-2">إضافة موكل جديد</h3>

      {message && (
        <div className={message.type === 'success' ? 'text-sm p-3 rounded-lg bg-green-50 text-green-700' : 'text-sm p-3 rounded-lg bg-red-50 text-red-700'}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <input type="text" placeholder="اسم الموكل" value={fullName} onChange={function (e) { setFullName(e.target.value) }} className="px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500" required />
        <input type="text" placeholder="رقم الهاتف" value={phone} onChange={function (e) { setPhone(e.target.value) }} className="px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500" />
        <input type="text" placeholder="اسم المستخدم" value={username} onChange={function (e) { setUsername(e.target.value) }} className="px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500" required />
        <div className="flex gap-2">
          <input type="text" placeholder="كلمة المرور" value={password} onChange={function (e) { setPassword(e.target.value) }} className="flex-1 px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500" required />
          <button type="button" onClick={function () { setPassword(generatePassword()) }} className="px-3 py-2 bg-slate-100 rounded-xl hover:bg-slate-200 text-sm" title="توليد كلمة مرور">🎲</button>
        </div>
      </div>

      <button type="submit" disabled={loading} className="bg-amber-500 text-white font-bold px-6 py-2 rounded-xl hover:bg-amber-600 transition disabled:opacity-50">
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
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-6 border border-slate-100 space-y-4">
      <h3 className="font-bold text-slate-900 mb-2">إضافة قضية جديدة لموكل موجود</h3>

      {message && (
        <div className={message.type === 'success' ? 'text-sm p-3 rounded-lg bg-green-50 text-green-700' : 'text-sm p-3 rounded-lg bg-red-50 text-red-700'}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <select value={clientId} onChange={function (e) { setClientId(e.target.value) }} className="px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500" required>
          <option value="">اختر الموكل</option>
          {allClients ? allClients.map(function (c: any) {
            return <option key={c.id} value={c.id}>{c.users ? c.users.full_name : ''}</option>
          }) : null}
        </select>

        <input type="text" placeholder="رقم القضية الرسمي (مثال: 1446/102)" value={caseNumberInput} onChange={function (e) { setCaseNumberInput(e.target.value) }} className="px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500" required dir="ltr" />

        <select value={caseType} onChange={function (e) { setCaseType(e.target.value) }} className="px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500">
          {CASE_TYPES.map(function (t) {
            return <option key={t} value={t}>{t}</option>
          })}
        </select>

        <input type="text" placeholder="عنوان القضية" value={title} onChange={function (e) { setTitle(e.target.value) }} className="px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500" required />

        <div>
          <input
            type="text"
            placeholder="الطرف الآخر"
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
            className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
          />
          {conflictWarning && (
            <p className="text-[11px] text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-1.5">⚠️ {conflictWarning}</p>
          )}
        </div>

        <select value={courtName} onChange={function (e) { setCourtName(e.target.value) }} className="px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500" required>
          <option value="">اختر المحكمة</option>
          {yemenCourts ? yemenCourts.map(function (c: any) {
            return <option key={c.id} value={c.name}>{c.name}</option>
          }) : null}
          <option value="__custom__">محكمة أخرى (اكتبها يدوياً)</option>
        </select>

        {courtName === '__custom__' && (
          <input type="text" placeholder="اكتب اسم المحكمة بالضبط" value={customCourtName} onChange={function (e) { setCustomCourtName(e.target.value) }} className="px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 col-span-2" required />
        )}

        <select value={stage} onChange={function (e) { setStage(e.target.value) }} className="px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500">
          <option value="ابتدائي">مرحلة: ابتدائي</option>
          <option value="استئناف">مرحلة: استئناف</option>
          <option value="نقض">مرحلة: نقض</option>
        </select>
        <select value={lawyerId} onChange={function (e) { setLawyerId(e.target.value) }} className="px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 col-span-2">
          <option value="all">الكل (غير مخصصة لمحامٍ معيّن)</option>
          {allLawyers ? allLawyers.map(function (l: any) {
            return <option key={l.id} value={l.id}>{l.users ? l.users.full_name : ''}</option>
          }) : null}
        </select>

        <div className="col-span-2">
          <label className="text-xs text-slate-500 block mb-1.5">محامون مشاركون (اختياري)</label>
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
                      ? 'text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                      : checked
                        ? 'text-xs px-3 py-1.5 rounded-lg border border-amber-400 bg-amber-50 text-amber-800 font-bold'
                        : 'text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }
                >
                  {checked ? '✓ ' : ''}{l.users ? l.users.full_name : ''}
                  {isPrimary ? ' (مسؤول)' : ''}
                </button>
              )
            }) : null}
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">
            يُمنح المحامون المختارون صلاحية الاطلاع على القضية والعمل عليها إلى جانب المحامي المسؤول.
          </p>
        </div>

        <div className="col-span-2">
          <label className="text-xs text-slate-500 block mb-1">تاريخ أول جلسة (اختياري)</label>
          <input type="date" value={firstSessionDate} onChange={function (e) { setFirstSessionDate(e.target.value) }} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
      </div>

      <button type="submit" disabled={loading} className="bg-amber-500 text-white font-bold px-6 py-2 rounded-xl hover:bg-amber-600 transition disabled:opacity-50">
        {loading ? 'جارٍ الحفظ...' : 'حفظ القضية'}
      </button>
    </form>
  )
}

export default function ManagerTabs({ cases, clientsCount, lawyersCount, allClients, allLawyers, yemenCourts, calendarEvents, auditLogs, allSessions, manageableAccounts, isTech }: any) {
  const [activeTab, setActiveTab] = useState('overview')

  const router = useRouter()

  // نحدّث بيانات الصفحة من الخادم دون إعادة تحميل، ليبقى التبويب النشط كما هو
  function handleRefresh() {
    router.refresh()
  }

  return (
    <div>
      <div className="flex gap-2 mb-6 border-b border-slate-200 overflow-x-auto">
        {TABS.map(function (tab) {
          return (
            <button key={tab.id} onClick={function () { setActiveTab(tab.id) }} className={activeTab === tab.id ? 'px-5 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition border-amber-500 text-amber-600' : 'px-5 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition border-transparent text-slate-500 hover:text-slate-700'}>
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl shadow p-6 text-center border border-slate-100">
              <p className="text-3xl font-bold text-amber-600">{cases ? cases.length : 0}</p>
              <p className="text-slate-500 text-sm mt-1">إجمالي القضايا</p>
            </div>
            <div className="bg-white rounded-2xl shadow p-6 text-center border border-slate-100">
              <p className="text-3xl font-bold text-amber-600">{clientsCount || 0}</p>
              <p className="text-slate-500 text-sm mt-1">إجمالي الموكلين</p>
            </div>
            <div className="bg-white rounded-2xl shadow p-6 text-center border border-slate-100">
              <p className="text-3xl font-bold text-amber-600">{lawyersCount || 0}</p>
              <p className="text-slate-500 text-sm mt-1">إجمالي المحامين</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'overview' && (
        <>
          <div className="mt-6"><ReportsPanel cases={cases} /></div>
          <div className="mt-6"><PredictiveAnalytics cases={cases} sessions={allSessions} /></div>
          <div className="mt-6"><AuditLog logs={auditLogs} /></div>
        </>
      )}

      {activeTab === 'accounts' && (
        <AccountsTab accounts={manageableAccounts} isTech={isTech} />
      )}

      {activeTab === 'calendar' && (
        <CalendarView events={calendarEvents || []} />
      )}

      {activeTab === 'clients-cases' && (
        <div className="space-y-6">
          <AddClientForm onSuccess={handleRefresh} />
          <AddCaseForm allClients={allClients} allLawyers={allLawyers} yemenCourts={yemenCourts} onSuccess={handleRefresh} />
          <div>
            <h2 className="font-bold text-slate-900 mb-3 text-lg">جدول كل القضايا</h2>
            <CasesTable cases={cases} allLawyers={allLawyers} />
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <TeamTab allLawyers={allLawyers} cases={cases} onRefresh={handleRefresh} />
      )}

      {activeTab === 'permissions' && (
        <PermissionsTab cases={cases} allLawyers={allLawyers} />
      )}
    </div>
  )
}
