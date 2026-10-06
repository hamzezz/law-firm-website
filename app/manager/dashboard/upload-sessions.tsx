'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function UploadSessions() {
  const [uploading, setUploading] = useState(false)
  const [sessionDate, setSessionDate] = useState('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files ? e.target.files[0] : null
    if (!file) return

    if (!sessionDate) {
      setError('حدد تاريخ جلسات الملف أولاً')
      e.target.value = ''
      return
    }

    setUploading(true)
    setError('')
    setResult(null)

    try {
      const supabase = createClient()
      const sessionResult = await supabase.auth.getSession()
      const token = sessionResult.data.session ? sessionResult.data.session.access_token : ''

      const formData = new FormData()
      formData.append('file', file)
      formData.append('sessionDate', sessionDate)

      const res = await fetch('/api/manager/upload-sessions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
        },
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'حدث خطأ أثناء معالجة الملف')
        setUploading(false)
        return
      }

      setResult(data)
    } catch (err) {
      setError('حدث خطأ في الاتصال بالخادم')
    }
    setUploading(false)
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6 border border-slate-100 space-y-4">
      <h3 className="font-bold text-slate-900 mb-2">رفع قائمة جلسات اليوم (من وزارة العدل)</h3>

      {error && (
        <div className="text-sm p-3 rounded-lg bg-red-50 text-red-700">{error}</div>
      )}

      {result && (
        <div className="text-sm p-4 rounded-lg bg-emerald-50 text-emerald-800 space-y-2">
          <p className="font-bold">تم تحليل الملف بنجاح</p>
          <p>إجمالي القضايا المستخرجة من الملف: {result.totalExtracted}</p>
          <p className="font-bold">القضايا التي تخص مكتبنا: {result.totalMatched}</p>
          {result.matchedCases && result.matchedCases.length > 0 && (
            <ul className="mt-2 space-y-1">
              {result.matchedCases.map((c: any, i: number) => (
                <li key={i} className="text-xs bg-white rounded-lg p-2">
                  {c.title} — {c.caseNumber} — {c.courtName}
                </li>
              ))}
            </ul>
          )}
          {result.needsReview && result.needsReview.length > 0 && (
            <div className="mt-4 bg-amber-50 border border-amber-300 rounded-xl p-3">
              <p className="font-bold text-amber-800 text-sm">
                تحتاج مراجعتك: {result.needsReview.length}
              </p>
              <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                تطابق رقم القضية والمحكمة ولم يتطابق اسم أي من الأطراف، فلم يُرسل إشعار.
                راجع السطر كما ورد في الملف واحسم بنفسك.
              </p>
              <ul className="mt-2 space-y-2">
                {result.needsReview.map((r: any, i: number) => (
                  <li key={i} className="text-xs bg-white rounded-lg p-2">
                    <span className="font-bold">{r.caseNumber}</span> — {r.courtName}
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{r.rawLine}</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      المرشحة: {r.candidates.map((c: any) => c.title + " / " + c.clientName).join(" ، ")}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mb-3">
        <label className="text-xs text-slate-500 block mb-1">تاريخ جلسات الملف</label>
        <input
          type="date"
          value={sessionDate}
          onChange={(e) => setSessionDate(e.target.value)}
          className="px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500"
        />
        <p className="text-[10px] text-slate-400 mt-1">
          التاريخ المذكور في عنوان الملف — تُنشأ الجلسات به.
        </p>
      </div>

      <label className="inline-flex items-center gap-2 bg-amber-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-amber-600 transition cursor-pointer disabled:opacity-50">
        {uploading ? 'جارٍ التحليل...' : '📎 رفع ملف جلسات اليوم (PDF)'}
        <input type="file" accept="application/pdf" onChange={handleFileChange} disabled={uploading} className="hidden" />
      </label>
    </div>
  )
}
