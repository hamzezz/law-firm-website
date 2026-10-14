'use client'

import { useState } from 'react'

/**
 * يظهر وحده حين تكون القضية مغلقة وبقي فيها مستند لم يصل إلى الأرشيف —
 * أي حين تعثّرت الأرشفة التلقائية عند الإغلاق. الإعادة آمنة: ما نُقل لا يُنقل مرّتين.
 */
export default function ArchiveRetry({ caseId, pending }: { caseId: string; pending: number }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  if (pending <= 0) return null

  async function handleArchive() {
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/manager/archive-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId }),
      })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setMessage((data && data.error) || 'تعذّرت الأرشفة')
        setLoading(false)
        return
      }
      if (data && data.warning) {
        setMessage(data.warning)
        setLoading(false)
        return
      }
      window.location.reload()
    } catch {
      setMessage('تعذّر الاتصال بخدمة الأرشفة')
      setLoading(false)
    }
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
      <p className="text-xs text-amber-800 font-bold">
        القضية مغلقة، وبقي {pending} من مستنداتها خارج الأرشيف
      </p>
      <p className="text-[11px] text-amber-700">
        تعثّرت الأرشفة التلقائية. المستندات سليمة في مكانها، وإعادة المحاولة آمنة.
      </p>
      {message && <p className="text-[11px] text-red-700">{message}</p>}
      <button
        onClick={handleArchive}
        disabled={loading}
        className="text-xs bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition font-bold disabled:opacity-50"
      >
        {loading ? 'جارٍ الأرشفة…' : 'أرشفة المستندات الآن'}
      </button>
    </div>
  )
}
