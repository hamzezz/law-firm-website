'use client'

import { useState } from 'react'

type Props = {
  caseId: string
  caseNumber: string
  initial: {
    title: string
    case_number: string
    court_name: string
    case_type: string
    stage: string
    other_party: string
  }
}

export default function CaseAdmin({ caseId, caseNumber, initial }: Props) {
  const [open, setOpen] = useState(false)
  const [fields, setFields] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [delOpen, setDelOpen] = useState(false)
  const [counts, setCounts] = useState<any>(null)
  const [typed, setTyped] = useState('')
  const [deleting, setDeleting] = useState(false)

  function set(k: string, v: string) {
    setFields((p) => ({ ...p, [k]: v }))
  }

  async function save() {
    setSaving(true); setMsg('')
    const res = await fetch('/api/manager/case-admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, fields }),
    })
    const data = await res.json()
    setMsg(data.success ? data.message : (data.error || 'تعذّر الحفظ'))
    setSaving(false)
    if (data.success) setTimeout(() => window.location.reload(), 900)
  }

  async function openDelete() {
    setDelOpen(true); setTyped(''); setMsg('')
    const res = await fetch('/api/manager/case-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId }),
    })
    setCounts(await res.json())
  }

  async function doDelete() {
    setDeleting(true); setMsg('')
    const res = await fetch('/api/manager/case-admin', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, confirmNumber: typed }),
    })
    const data = await res.json()
    if (data.success) {
      window.location.href = '/manager/dashboard'
      return
    }
    setMsg(data.error || 'تعذّر الحذف')
    setDeleting(false)
  }

  const F = [
    ['title', 'عنوان القضية'],
    ['case_number', 'رقم القضية'],
    ['court_name', 'المحكمة'],
    ['case_type', 'نوع القضية'],
    ['stage', 'المرحلة'],
    ['other_party', 'الطرف الآخر'],
  ]

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mt-5">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-bold text-slate-900 text-sm">إدارة بيانات القضية</h4>
        <span className="text-[11px] text-slate-400">للمدير التقني</span>
      </div>

      {msg && <p className="text-xs mt-2 font-bold text-slate-700">{msg}</p>}

      <div className="flex gap-2 mt-3 flex-wrap">
        <button onClick={() => setOpen(!open)} className="text-xs font-bold bg-slate-800 text-white px-4 py-2 rounded-xl">
          {open ? 'إخفاء التعديل' : 'تعديل البيانات'}
        </button>
        <button onClick={openDelete} className="text-xs font-bold bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded-xl">
          حذف القضية نهائياً
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-2">
          {F.map(([k, label]) => (
            <div key={k}>
              <label className="text-[11px] text-slate-500 block mb-1">{label}</label>
              <input
                value={(fields as any)[k] || ''}
                onChange={(e) => set(k, e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          ))}
          <button onClick={save} disabled={saving} className="text-xs font-bold bg-amber-600 text-white px-5 py-2 rounded-xl disabled:opacity-50">
            {saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
          </button>
        </div>
      )}

      {delOpen && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="font-bold text-red-800 text-sm">حذف نهائي لا رجعة فيه</p>
          {counts && (
            <p className="text-xs text-red-700 mt-2 leading-relaxed">
              سيُحذف مع القضية: {counts.sessions} جلسة، و{counts.notifications} إشعاراً،
              و{counts.deadlines} موعداً حرجاً. ولن يمكن استرجاع شيء منها.
            </p>
          )}
          <p className="text-xs text-slate-600 mt-3">
            للتأكيد اكتب رقم القضية: <span className="font-bold">{caseNumber}</span>
          </p>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            dir="ltr"
            className="w-full px-3 py-2 border border-red-300 rounded-xl text-sm mt-2 outline-none focus:ring-2 focus:ring-red-400"
          />
          <div className="flex gap-2 mt-3">
            <button onClick={doDelete} disabled={deleting || typed.trim() !== caseNumber.trim()} className="text-xs font-bold bg-red-600 text-white px-5 py-2 rounded-xl disabled:opacity-40">
              {deleting ? 'جارٍ الحذف...' : 'تأكيد الحذف النهائي'}
            </button>
            <button onClick={() => setDelOpen(false)} className="text-xs font-bold bg-white border px-5 py-2 rounded-xl">
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
