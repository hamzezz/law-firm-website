'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function statusBadge(status: string) {
  const s = status?.toLowerCase() || ''
  if (s.includes('active')) return 'bg-green-100 text-green-700'
  if (s.includes('postponed')) return 'bg-amber-100 text-amber-700'
  if (s.includes('closed')) return 'bg-slate-200 text-slate-700'
  return 'bg-blue-100 text-blue-700'
}

function stageBadge(stage: string) {
  if (stage === 'استئناف') return 'bg-amber-100 text-amber-700'
  if (stage === 'نقض') return 'bg-emerald-100 text-emerald-700'
  return 'bg-blue-100 text-blue-700'
}

function statusLabel(status: string) {
  const map: Record<string, string> = { active: 'نشطة', postponed: 'مؤجلة', closed: 'مغلقة' }
  return map[status?.toLowerCase()] || status
}

const TASK_TYPES = [
  'حضور جلسة',
  'تصوير محضر',
  'متابعة ملف في المحكمة',
  'متابعة ملف في النيابة',
  'أخرى',
]

const PAGE_SIZE = 8

function AssignTaskModal({ caseItem, allLawyers, onClose }: any) {
  const [lawyerId, setLawyerId] = useState('')
  const [taskType, setTaskType] = useState(TASK_TYPES[0])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSend() {
    if (!lawyerId) {
      setMessage({ type: 'error', text: 'اختر المحامي المكلَّف أولاً' })
      return
    }
    setLoading(true)
    setMessage(null)

    try {
      const supabase = createClient()
      const lawyer = allLawyers.find((l: any) => l.id === lawyerId)

      const { error } = await supabase.from('notifications').insert({
        recipient_user_id: lawyer.user_id,
        case_id: caseItem.id,
        type: 'task_assignment',
        title: `مهمة جديدة: ${taskType}`,
        body: `قضية: ${caseItem.title} (${caseItem.case_number})${notes ? ' — ' + notes : ''}`,
      })

      if (error) {
        setMessage({ type: 'error', text: error.message })
        setLoading(false)
        return
      }

      setMessage({ type: 'success', text: 'تم إرسال التكليف بنجاح' })
      setLoading(false)
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ أثناء الإرسال' })
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full space-y-4"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">تكليف بمهمة — {caseItem.title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        {message && (
          <div
            className={`text-sm p-3 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <select
          value={lawyerId}
          onChange={(e) => setLawyerId(e.target.value)}
          className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">اختر المحامي المكلَّف</option>
          {allLawyers?.map((l: any) => (
            <option key={l.id} value={l.id}>{l.users?.full_name}</option>
          ))}
        </select>

        <select
          value={taskType}
          onChange={(e) => setTaskType(e.target.value)}
          className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
        >
          {TASK_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <textarea
          placeholder="ملاحظات نصية (اختياري)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 h-24 resize-none"
        />

        <button
          onClick={handleSend}
          disabled={loading}
          className="w-full bg-amber-500 text-white font-bold py-3 rounded-xl hover:bg-amber-600 transition disabled:opacity-50"
        >
          {loading ? 'جارٍ الإرسال...' : 'إرسال التكليف'}
        </button>
      </div>
    </div>
  )
}

export default function CasesTable({ cases, allLawyers }: any) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [lawyerFilter, setLawyerFilter] = useState('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [taskModalCase, setTaskModalCase] = useState<any | null>(null)
  const [localCases, setLocalCases] = useState(cases || [])

  const filtered = useMemo(() => {
    let result = localCases || []

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (c: any) =>
          c.case_number?.toLowerCase().includes(q) ||
          c.title?.toLowerCase().includes(q) ||
          c.clients?.users?.full_name?.toLowerCase().includes(q)
      )
    }

    if (statusFilter !== 'all') {
      result = result.filter((c: any) => c.status?.toLowerCase() === statusFilter)
    }

    if (lawyerFilter === 'unassigned') {
      result = result.filter((c: any) => !c.lawyers)
    } else if (lawyerFilter !== 'all') {
      result = result.filter((c: any) => c.lawyers?.id === lawyerFilter)
    }

    return result
  }, [localCases, search, statusFilter, lawyerFilter])

  const visible = filtered.slice(0, visibleCount)

  async function handleLawyerChange(caseId: string, newLawyerId: string) {
    setUpdatingId(caseId)
    const supabase = createClient()

    const { error } = await supabase
      .from('cases')
      .update({ primary_lawyer_id: newLawyerId === 'all' ? null : newLawyerId })
      .eq('id', caseId)

    if (!error) {
      const newLawyer = newLawyerId === 'all' ? null : allLawyers.find((l: any) => l.id === newLawyerId)
      setLocalCases((prev: any) =>
        prev.map((c: any) =>
          c.id === caseId ? { ...c, lawyers: newLawyer ? { id: newLawyer.id, users: newLawyer.users } : null } : c
        )
      )
    }
    setUpdatingId(null)
  }

  return (
    <div className="bg-white rounded-2xl shadow border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="بحث برقم القضية أو العنوان أو اسم الموكل"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setVisibleCount(PAGE_SIZE)
          }}
          className="flex-1 px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setVisibleCount(PAGE_SIZE)
          }}
          className="px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm"
        >
          <option value="all">كل الحالات</option>
          <option value="active">نشطة</option>
          <option value="postponed">مؤجلة</option>
          <option value="closed">مغلقة</option>
        </select>
        <select
          value={lawyerFilter}
          onChange={(e) => {
            setLawyerFilter(e.target.value)
            setVisibleCount(PAGE_SIZE)
          }}
          className="px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm"
        >
          <option value="all">كل المحامين</option>
          <option value="unassigned">غير مخصصة (الكل)</option>
          {allLawyers?.map((l: any) => (
            <option key={l.id} value={l.id}>{l.users?.full_name}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 && (
        <div className="p-10 text-center text-slate-400 text-sm">لا توجد نتائج مطابقة.</div>
      )}

      <div className="divide-y divide-slate-100">
        {visible.map((c: any) => (
          <div key={c.id} className="p-4 hover:bg-slate-50 transition">
            <div className="flex items-start justify-between mb-2">
              <Link href={`/manager/cases/${c.id}`} className="flex-1">
                <h4 className="font-bold text-slate-900 text-sm hover:text-amber-600 transition">{c.title}</h4>
                <p className="text-slate-400 text-xs mt-1">
                  {c.case_number} — الموكل: {c.clients?.users?.full_name || 'غير محدد'}
                </p>
              </Link>
              <div className="flex flex-col gap-1 items-end">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadge(c.status)}`}>{statusLabel(c.status)}</span>
                {c.stage && (<span className={`px-3 py-1 rounded-full text-xs font-bold ${stageBadge(c.stage)}`}>{c.stage}</span>)}
              </div>
              </div>

            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <select
                value={c.lawyers?.id || 'all'}
                onChange={(e) => handleLawyerChange(c.id, e.target.value)}
                disabled={updatingId === c.id}
                className="text-xs px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 flex-1"
              >
                <option value="all">الكل (غير مخصصة)</option>
                {allLawyers?.map((l: any) => (
                  <option key={l.id} value={l.id}>{l.users?.full_name}</option>
                ))}
              </select>

              <button
                onClick={() => setTaskModalCase(c)}
                className="text-xs px-4 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition font-bold whitespace-nowrap"
              >
                تكليف بمهمة
              </button>
            </div>
          </div>
        ))}
      </div>

      {visibleCount < filtered.length && (
        <div className="p-4 text-center border-t border-slate-100">
          <button
            onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
            className="text-amber-600 font-bold text-sm hover:text-amber-700"
          >
            عرض المزيد ({filtered.length - visibleCount} قضية متبقية)
          </button>
        </div>
      )}

      {taskModalCase && (
        <AssignTaskModal
          caseItem={taskModalCase}
          allLawyers={allLawyers}
          onClose={() => setTaskModalCase(null)}
        />
      )}
    </div>
  )
}
