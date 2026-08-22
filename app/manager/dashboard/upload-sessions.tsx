'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function UploadSessions() {
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files ? e.target.files[0] : null
    if (!file) return

    setUploading(true)
    setError('')
    setResult(null)

    try {
      const supabase = createClient()
      const sessionResult = await supabase.auth.getSession()
      const token = sessionResult.data.session ? sessionResult.data.session.access_token : ''

      const formData = new FormData()
      formData.append('file', file)

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
        </div>
      )}

      <label className="inline-flex items-center gap-2 bg-amber-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-amber-600 transition cursor-pointer disabled:opacity-50">
        {uploading ? 'جارٍ التحليل...' : '📎 رفع ملف جلسات اليوم (PDF)'}
        <input type="file" accept="application/pdf" onChange={handleFileChange} disabled={uploading} className="hidden" />
      </label>
    </div>
  )
}
