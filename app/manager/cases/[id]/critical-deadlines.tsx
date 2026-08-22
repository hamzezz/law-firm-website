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
      <button onClick={() => setOpen(true)} className="text-xs bg-red-50 text-red-700 px-4 py-2 rounded-lg hover:bg-red-100 transition font-bold">
        ⏰ تسجيل موعد حرج جديد
      </button>
    )
  }

  return (
    <div className="bg-red-50/50 border border-red-100 rounded-2xl p-5 space-y-3">
      <h4 className="font-bold text-slate-900 text-sm">تسجيل موعد حرج</h4>

      {message && (
        <div className={message.type === 'success' ? 'text-xs p-2 rounded-lg bg-green-50 text-green-700' : 'text-xs p-2 rounded-lg bg-red-100 text-red-700'}>
          {message.text}
        </div>
      )}

      <select value={deadlineType} onChange={(e) => setDeadlineType(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-red-400">
        {DEADLINE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>

      <input type="text" placeholder="وصف مختصر (اختياري)" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-red-400" />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-slate-500 block mb-1">تاريخ بداية المهلة</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-red-400" />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 block mb-1">عدد أيام المهلة</label>
          <input type="text" placeholder="مثال: 15" value={daysGiven} onChange={(e) => setDaysGiven(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-red-400" dir="ltr" />
        </div>
      </div>

      <p className="text-[10px] text-slate-400">⚠️ يرجى إدخال عدد الأيام بدقة وفق النص القانوني الرسمي المطبَّق على نوع القضية.</p>

      <div className="flex gap-2">
        <button onClick={handleSave} disabled={loading} className="flex-1 bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700 transition text-xs disabled:opacity-50">
          {loading ? 'جارٍ الحفظ...' : 'حفظ الموعد'}
        </button>
        <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-xs">إلغاء</button>
      </div>
    </div>
  )
}

export default function CriticalDeadlines({ caseId, deadlines }: { caseId: string; deadlines: any[] }) {
  const [refreshKey, setRefreshKey] = useState(0)

  function handleRefresh() {
    window.location.reload()
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
          المواعيد الحرجة
        </h3>
      </div>

      {deadlines && deadlines.length > 0 && (
        <div className="space-y-2 mb-4">
          {deadlines.map((d: any) => {
            const remaining = daysRemaining(d.deadline_date)
            const isUrgent = remaining <= 3
            return (
              <div key={d.id} className={'flex items-center gap-3 p-3 rounded-xl ' + (isUrgent ? 'bg-red-50' : 'bg-amber-50')}>
                <div className={'w-11 h-11 rounded-lg flex flex-col items-center justify-center font-bold flex-shrink-0 ' + (isUrgent ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600')}>
                  <span className="text-sm leading-none">{remaining >= 0 ? remaining : 0}</span>
                  <span className="text-[8px]">يوم</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-xs text-slate-800">{d.deadline_type}</p>
                  <p className="text-[10px] text-slate-400">تنتهي في {new Date(d.deadline_date).toLocaleDateString('ar-SA')}</p>
                  {d.description && <p className="text-[10px] text-slate-500 mt-0.5">{d.description}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AddDeadlineForm caseId={caseId} onSuccess={handleRefresh} />
    </div>
  )
}
