'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const OUTCOMES = ['لصالحنا', 'ضدنا', 'تسوية / صلح']

export default function CloseCase({ caseId, currentStatus }: { caseId: string; currentStatus: string }) {
  const [open, setOpen] = useState(false)
  const [outcome, setOutcome] = useState(OUTCOMES[0])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleClose() {
    setLoading(true)
    setMessage('')

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('cases')
        .update({
          status: 'closed',
          outcome: outcome,
          closed_at: new Date().toISOString(),
        })
        .eq('id', caseId)

      if (error) {
        setMessage('خطأ: ' + error.message)
        setLoading(false)
        return
      }

      window.location.reload()
    } catch (err) {
      setMessage('حدث خطأ غير متوقع')
      setLoading(false)
    }
  }

  if (currentStatus === 'closed') return null

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs bg-slate-100 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-200 transition font-bold">
        🔒 إغلاق القضية نهائياً
      </button>
    )
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
      <h4 className="font-bold text-slate-900 text-sm">إغلاق القضية — تحديد النتيجة النهائية</h4>
      {message && <p className="text-xs text-red-600">{message}</p>}

      <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-slate-400">
        {OUTCOMES.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>

      <p className="text-[10px] text-amber-600">⚠️ هذا الإجراء نهائي ويُستخدم لحساب تقارير أداء المكتب.</p>

      <div className="flex gap-2">
        <button onClick={handleClose} disabled={loading} className="flex-1 bg-slate-800 text-white font-bold py-2 rounded-lg hover:bg-slate-900 transition text-xs disabled:opacity-50">
          {loading ? 'جارٍ الإغلاق...' : 'تأكيد إغلاق القضية'}
        </button>
        <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition text-xs">إلغاء</button>
      </div>
    </div>
  )
}
