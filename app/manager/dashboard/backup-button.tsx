'use client'

import { useState } from 'react'

export default function BackupButton() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleBackup() {
    setLoading(true)
    setMessage('')

    try {
      const res = await fetch('/api/manager/backup')

      if (!res.ok) {
        const data = await res.json()
        setMessage('فشل: ' + (data.error || 'خطأ غير معروف'))
        setLoading(false)
        return
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'backup-' + new Date().toISOString().slice(0, 10) + '.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setMessage('تم تنزيل النسخة الاحتياطية بنجاح — احفظها في مكان آمن')
    } catch (err) {
      setMessage('حدث خطأ أثناء إنشاء النسخة')
    }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-2xl shadow p-5 border border-slate-100">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">النسخ الاحتياطي</h3>
          <p className="text-xs text-slate-400 mt-1">
            نزّل نسخة كاملة من بيانات النظام واحفظها خارجياً. يُنصح بذلك أسبوعياً.
          </p>
        </div>
        <button
          onClick={handleBackup}
          disabled={loading}
          className="bg-slate-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-slate-900 transition disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? 'جارٍ التحضير...' : '💾 تنزيل نسخة احتياطية'}
        </button>
      </div>

      {message && (
        <div className={'text-xs p-2.5 rounded-lg mt-3 ' + (message.startsWith('تم') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
          {message}
        </div>
      )}
    </div>
  )
}
