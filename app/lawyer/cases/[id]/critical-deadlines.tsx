'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const DEADLINE_TYPES = ['مهلة استئناف', 'مهلة نقض', 'مهلة تظلم', 'أخرى']

function daysRemaining(dateStr: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  const diffMs = target.getTime() - today.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

function fmt(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return dateStr
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return day + '/' + m + '/' + d.getFullYear()
}

function AddDeadlineForm({ caseId, onSuccess }: { caseId: string; onSuccess: () => void }) {
  const [open, setOpen] = useState(false)
  const [deadlineType, setDeadlineType] = useState(DEADLINE_TYPES[0])
  const [description, setDescription] = useState('')
  const [daysGiven, setDaysGiven] = useState('')
  const [startDate, setStartDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSave() {
    if (!startDate || !daysGiven) {
      setMessage({ type: 'error', text: 'حدد تاريخ البداية وعدد الأيام' })
      return
    }
    setLoading(true)
    setMessage(null)

    try {
      const supabase = createClient()
      const start = new Date(startDate + 'T00:00:00')
      start.setDate(start.getDate() + parseInt(daysGiven))
      const deadlineDate = start.toISOString().slice(0, 10)

      const { error } = await supabase.from('critical_deadlines').insert({
        case_id: caseId,
        deadline_type: deadlineType,
        description: description || null,
        deadline_date: deadlineDate,
        days_given: parseInt(daysGiven),
      })

      if (error) {
        setMessage({ type: 'error', text: error.message })
        setLoading(false)
        return
      }

      setMessage({ type: 'success', text: 'تم تسجيل الموعد الحرج بنجاح' })
      setTimeout(() => {
        setOpen(false)
        onSuccess()
      }, 1000)
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ أثناء الحفظ' })
    }
    setLoading(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-sm bg-red-50 text-red-700 px-4 py-3 rounded-xl hover:bg-red-100 transition font-bold"
      >
        تسجيل موعد حرج جديد
      </button>
    )
  }

  return (
    <div className="bg-red-50/60 border border-red-100 rounded-xl p-4 space-y-3">
      <h4 className="font-display font-bold text-slate-900 text-sm">تسجيل موعد حرج</h4>

      {message && (
        <div className={
          'text-xs p-2.5 rounded-lg ' +
          (message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-100 text-red-700')
        }>
          {message.text}
        </div>
      )}

      <div>
        <label className="text-[11px] text-slate-500 block mb-1.5">نوع المهلة</label>
        <select
          value={deadlineType}
          onChange={(e) => setDeadlineType(e.target.value)}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-red-300"
        >
          {DEADLINE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div>
        <label className="text-[11px] text-slate-500 block mb-1.5">وصف مختصر (اختياري)</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-red-300"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-slate-500 block mb-1.5">تاريخ بداية المهلة</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-red-300"
          />
        </div>
        <div>
          <label className="text-[11px] text-slate-500 block mb-1.5">عدد أيام المهلة</label>
          <input
            type="text"
            placeholder="مثال: 15"
            value={daysGiven}
            onChange={(e) => setDaysGiven(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-red-300"
            dir="ltr"
          />
        </div>
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed">
        ⚠️ يرجى إدخال عدد الأيام بدقة وفق النص القانوني الرسمي المطبَّق على نوع القضية.
      </p>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition text-sm disabled:opacity-50"
        >
          {loading ? 'جارٍ الحفظ...' : 'حفظ الموعد'}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-5 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition text-sm"
        >
          إلغاء
        </button>
      </div>
    </div>
  )
}

export default function CriticalDeadlines({ caseId, deadlines }: { caseId: string; deadlines: any[] }) {
  function handleRefresh() {
    window.location.reload()
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
        <h2 className="font-display font-bold text-slate-900 text-sm md:text-base">المواعيد الحرجة</h2>
      </div>

      {deadlines && deadlines.length > 0 && (
        <div className="space-y-2.5 mb-4">
          {deadlines.map((d: any) => {
            const remaining = daysRemaining(d.deadline_date)
            const isUrgent = remaining <= 3
            return (
              <div
                key={d.id}
                className={'flex items-center gap-3 p-3 rounded-xl ' + (isUrgent ? 'bg-red-50' : 'bg-amber-50')}
              >
                <div className={
                  'w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold shrink-0 ' +
                  (isUrgent ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700')
                }>
                  <span className="text-base leading-none">{remaining >= 0 ? remaining : 0}</span>
                  <span className="text-[9px] mt-0.5">يوم</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-slate-800 leading-snug">{d.deadline_type}</p>
                  <p className="text-[11px] text-slate-500 mt-1">تنتهي في {fmt(d.deadline_date)}</p>
                  {d.description && <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{d.description}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AddDeadlineForm caseId={caseId} onSuccess={handleRefresh} />
    </section>
  )
}
